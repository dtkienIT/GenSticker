from __future__ import annotations

import base64
import binascii
import mimetypes
import re
import time
from pathlib import Path
from urllib.parse import urlsplit

import httpx

from sticker_generation.models import ImageGenerationRequest, ImageGenerationResult


class OpenAIImageProvider:
    """OpenAI GPT Image editing adapter using multipart image references."""

    def __init__(
        self,
        *,
        api_key: str,
        model_id: str = "gpt-image-1.5",
        client: httpx.AsyncClient | None = None,
        base_url: str = "https://api.openai.com/v1",
        timeout_seconds: float = 180.0,
        max_reference_bytes: int = 10 * 1024 * 1024,
        max_total_reference_bytes: int = 30 * 1024 * 1024,
        max_output_bytes: int = 20 * 1024 * 1024,
        estimated_cost_per_image_usd: float | None = None,
        trusted_result_domains: tuple[str, ...] = (),
    ) -> None:
        if not api_key.strip():
            raise ValueError("openai_api_key_required")
        if not re.fullmatch(r"[A-Za-z0-9._-]+", model_id):
            raise ValueError("openai_model_id_invalid")
        self.api_key = api_key
        self.model_id = model_id
        self.base_url = base_url.rstrip("/")
        self.max_reference_bytes = max_reference_bytes
        self.max_total_reference_bytes = max_total_reference_bytes
        self.max_output_bytes = max_output_bytes
        self.estimated_cost_per_image_usd = estimated_cost_per_image_usd
        self.trusted_result_domains = tuple(
            domain.lower().strip(".")
            for domain in trusted_result_domains
            if re.fullmatch(r"[A-Za-z0-9.-]+", domain.strip("."))
        )
        self.client = client or httpx.AsyncClient(timeout=timeout_seconds)
        self._owns_client = client is None

    async def close(self) -> None:
        if self._owns_client:
            await self.client.aclose()

    async def generate(self, request: ImageGenerationRequest) -> ImageGenerationResult:
        started = time.perf_counter()
        prompt = request.prompt
        if request.negative_prompt.strip():
            prompt = f"{prompt}\n\nAvoid these failures: {request.negative_prompt.strip()}"

        files: list[tuple[str, tuple[str, bytes, str]]] = []
        total_bytes = 0
        # Match the OpenAI SDK multipart shape for one versus many references.
        image_field = "image" if len(request.reference_images) == 1 else "image[]"
        for path in request.reference_images:
            filename, data, mime_type = self._read_image(path)
            total_bytes += len(data)
            if total_bytes > self.max_total_reference_bytes:
                raise ValueError("reference_images_too_large")
            files.append((image_field, (filename, data, mime_type)))

        # Ask compatible proxies for inline bytes so result URLs do not require
        # trusting an unrelated CDN host. The URL fallback below remains scoped
        # to the configured proxy origin.
        try:
            response = await self.client.post(
                f"{self.base_url}/images/edits",
                headers={"Authorization": f"Bearer {self.api_key}"},
                data={
                    "model": self.model_id,
                    "prompt": prompt,
                    "n": "1",
                    "size": request.size,
                    "quality": "medium",
                    "input_fidelity": "high",
                    "background": "transparent",
                    "output_format": "png",
                    "response_format": "b64_json",
                },
                files=files,
            )
        except httpx.TimeoutException as error:
            raise RuntimeError("openai_timeout") from error
        if response.status_code == 402:
            raise RuntimeError("openai_quota_or_billing_required")
        if response.status_code == 429:
            error_ids = self._error_identifiers(response)
            if error_ids & {"invalid_request", "invalid_request_error", "unknown_parameter"}:
                raise RuntimeError("openai_invalid_request")
            if error_ids & {
                "billing_hard_limit_reached",
                "credit_balance_exhausted",
                "insufficient_quota",
                "organization_spend_limit_exceeded",
                "organization_usage_limit_exceeded",
                "project_spend_limit_exceeded",
            }:
                raise RuntimeError("openai_quota_or_billing_required")
            raise RuntimeError("openai_rate_limit")
        if response.status_code in {401, 403}:
            raise RuntimeError("openai_api_key_or_permission_invalid")
        if response.status_code == 400:
            error_ids = self._error_identifiers(response)
            if error_ids & {
                "content_policy_violation",
                "image_generation_user_error",
                "moderation_blocked",
                "safety_system",
            }:
                raise RuntimeError("openai_safety_rejection")
            raise RuntimeError("openai_invalid_request")
        if response.status_code in {408, 504, 524}:
            raise RuntimeError("openai_timeout")
        if response.status_code >= 500:
            raise RuntimeError("openai_provider_unavailable")
        response.raise_for_status()
        image_bytes = await self._extract_image(response.json())
        if len(image_bytes) > self.max_output_bytes:
            raise ValueError("provider_output_too_large")
        return ImageGenerationResult(
            image_bytes=image_bytes,
            provider="openai",
            model=self.model_id,
            request_id=response.headers.get("x-request-id"),
            latency_seconds=time.perf_counter() - started,
            estimated_cost_usd=(
                self.estimated_cost_per_image_usd
                if self.estimated_cost_per_image_usd is not None
                else self._medium_output_cost(request.size)
            ),
        )

    @staticmethod
    def _error_identifiers(response: httpx.Response) -> set[str]:
        try:
            payload = response.json()
        except ValueError:
            return set()
        if not isinstance(payload, dict):
            return set()
        error = payload.get("error")
        if not isinstance(error, dict):
            return set()
        return {
            value
            for field in ("code", "type")
            if isinstance((value := error.get(field)), str)
        }

    @staticmethod
    def _medium_output_cost(size: str) -> float:
        return {
            "1024x1024": 0.034,
            "1536x1024": 0.05,
            "1024x1536": 0.05,
        }.get(size, 0.05)

    def _read_image(self, path: Path) -> tuple[str, bytes, str]:
        path = Path(path)
        if not path.is_file():
            raise FileNotFoundError(f"reference_image_missing:{path}")
        if path.stat().st_size > self.max_reference_bytes:
            raise ValueError("reference_image_too_large")
        mime_type = mimetypes.guess_type(path.name)[0]
        if mime_type not in {"image/jpeg", "image/png", "image/webp"}:
            raise ValueError("reference_image_type_unsupported")
        return path.name, path.read_bytes(), mime_type

    async def _extract_image(self, payload: object) -> bytes:
        if not isinstance(payload, dict):
            raise RuntimeError("openai_invalid_response")
        data = payload.get("data")
        if not isinstance(data, list) or not data:
            raise RuntimeError("openai_missing_image_result")
        first = data[0]
        if not isinstance(first, dict):
            raise RuntimeError("openai_invalid_image_result")

        encoded = first.get("b64_json")
        if isinstance(encoded, str):
            try:
                return base64.b64decode(encoded, validate=True)
            except (binascii.Error, ValueError) as error:
                raise RuntimeError("openai_invalid_image_data") from error

        image_url = first.get("url")
        if isinstance(image_url, str):
            return await self._download_same_origin_image(image_url)
        raise RuntimeError("openai_invalid_image_result")

    async def _download_same_origin_image(self, image_url: str) -> bytes:
        result_url = urlsplit(image_url)
        base_url = urlsplit(self.base_url)
        result_origin = (result_url.scheme, result_url.hostname, result_url.port)
        base_origin = (base_url.scheme, base_url.hostname, base_url.port)
        same_origin = result_origin == base_origin
        trusted_cdn = (
            result_url.port in {None, 443}
            and result_url.hostname is not None
            and any(
                result_url.hostname == domain
                or result_url.hostname.endswith(f".{domain}")
                for domain in self.trusted_result_domains
            )
        )
        if (
            result_url.scheme != "https"
            or result_url.username is not None
            or result_url.password is not None
            or not (same_origin or trusted_cdn)
        ):
            raise RuntimeError("openai_untrusted_image_url")

        try:
            async with self.client.stream(
                "GET",
                image_url,
                headers={"Authorization": f"Bearer {self.api_key}"},
                follow_redirects=False,
            ) as response:
                if response.is_redirect:
                    raise RuntimeError("openai_untrusted_image_url")
                if response.status_code >= 500:
                    raise RuntimeError("openai_provider_unavailable")
                response.raise_for_status()
                content_type = response.headers.get("content-type", "").split(";", 1)[0]
                if content_type not in {
                    "application/octet-stream",
                    "image/jpeg",
                    "image/png",
                    "image/webp",
                }:
                    raise RuntimeError("openai_invalid_image_result")

                image_bytes = bytearray()
                async for chunk in response.aiter_bytes():
                    image_bytes.extend(chunk)
                    if len(image_bytes) > self.max_output_bytes:
                        raise ValueError("provider_output_too_large")
                if not image_bytes:
                    raise RuntimeError("openai_invalid_image_result")
                return bytes(image_bytes)
        except httpx.TimeoutException as error:
            raise RuntimeError("openai_timeout") from error
