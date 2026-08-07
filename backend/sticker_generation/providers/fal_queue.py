from __future__ import annotations

import base64
import mimetypes
import time
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import httpx

from sticker_generation.models import ImageGenerationRequest, ImageGenerationResult


class FalQueueImageProvider:
    """Minimal async fal queue adapter with no dependency on the app layer."""

    def __init__(
        self,
        *,
        api_key: str,
        model_id: str,
        client: httpx.AsyncClient | None = None,
        base_url: str = "https://queue.fal.run",
        timeout_seconds: float = 180.0,
        poll_interval_seconds: float = 2.0,
        max_reference_bytes: int = 10 * 1024 * 1024,
        extra_input: dict[str, Any] | None = None,
        estimated_cost_per_image_usd: float = 0.0,
        allowed_hosts: tuple[str, ...] = ("queue.fal.run", ".fal.media"),
        max_output_bytes: int = 20 * 1024 * 1024,
        reference_field: str = "image_urls",
    ) -> None:
        if not api_key.strip():
            raise ValueError("fal_api_key_required")
        if not model_id.strip():
            raise ValueError("fal_model_id_required")
        self.api_key = api_key
        self.model_id = model_id.strip("/")
        self.base_url = base_url.rstrip("/")
        self.timeout_seconds = timeout_seconds
        self.poll_interval_seconds = poll_interval_seconds
        self.max_reference_bytes = max_reference_bytes
        self.extra_input = dict(extra_input or {})
        if {"prompt", "image_urls"} & self.extra_input.keys():
            raise ValueError("fal_extra_input_overrides_reserved_field")
        self.estimated_cost_per_image_usd = estimated_cost_per_image_usd
        self.allowed_hosts = allowed_hosts
        self.max_output_bytes = max_output_bytes
        if reference_field not in {"image_urls", "image_url"}:
            raise ValueError("fal_reference_field_invalid")
        self.reference_field = reference_field
        self.client = client or httpx.AsyncClient(timeout=timeout_seconds)
        self._owns_client = client is None

    async def close(self) -> None:
        if self._owns_client:
            await self.client.aclose()

    async def generate(self, request: ImageGenerationRequest) -> ImageGenerationResult:
        started = time.perf_counter()
        image_urls = [self._to_data_uri(path) for path in request.reference_images]
        if self.reference_field == "image_url" and len(image_urls) != 1:
            raise ValueError("fal_model_single_reference_not_supported")
        payload: dict[str, Any] = {
            "prompt": request.prompt,
            "num_images": 1,
            "output_format": "png",
        }
        payload[self.reference_field] = image_urls if self.reference_field == "image_urls" else image_urls[0]
        # Provider schemas differ; negative constraints are already embedded in
        # the compiled prompt, so avoid sending an unsupported field.
        payload.update(self.extra_input)

        headers = {
            "Authorization": f"Key {self.api_key}",
            "Content-Type": "application/json",
        }
        response = await self.client.post(
            f"{self.base_url}/{self.model_id}",
            json=payload,
            headers=headers,
        )
        response.raise_for_status()
        submitted = response.json()
        request_id = submitted.get("request_id")

        if "images" in submitted:
            result_payload = submitted
        else:
            status_url = submitted.get("status_url")
            response_url = submitted.get("response_url")
            if not status_url or not response_url:
                raise RuntimeError("fal_invalid_queue_response")
            self._validate_remote_url(status_url)
            self._validate_remote_url(response_url)
            await self._wait_for_completion(status_url, headers)
            result_response = await self.client.get(response_url, headers=headers)
            result_response.raise_for_status()
            result_payload = result_response.json()

        image_url = self._extract_image_url(result_payload)
        self._validate_remote_url(image_url)
        image_response = await self.client.get(image_url)
        image_response.raise_for_status()
        if len(image_response.content) > self.max_output_bytes:
            raise ValueError("provider_output_too_large")
        return ImageGenerationResult(
            image_bytes=image_response.content,
            image_url=image_url,
            provider="fal",
            model=self.model_id,
            request_id=request_id,
            latency_seconds=time.perf_counter() - started,
            estimated_cost_usd=float(
                submitted.get("cost_usd", self.estimated_cost_per_image_usd)
                or self.estimated_cost_per_image_usd
            ),
        )

    async def _wait_for_completion(self, status_url: str, headers: dict[str, str]) -> None:
        deadline = time.monotonic() + self.timeout_seconds
        while time.monotonic() < deadline:
            response = await self.client.get(status_url, headers=headers)
            response.raise_for_status()
            status = str(response.json().get("status", "")).upper()
            if status in {"COMPLETED", "SUCCEEDED", "SUCCESS"}:
                return
            if status in {"FAILED", "ERROR", "CANCELLED"}:
                raise RuntimeError(f"fal_generation_{status.lower()}")
            if self.poll_interval_seconds:
                await __import__("asyncio").sleep(self.poll_interval_seconds)
        raise TimeoutError("fal_generation_timeout")

    def _to_data_uri(self, path: Path) -> str:
        path = Path(path)
        if not path.is_file():
            raise FileNotFoundError(f"reference_image_missing:{path}")
        if path.stat().st_size > self.max_reference_bytes:
            raise ValueError("reference_image_too_large")
        mime_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        encoded = base64.b64encode(path.read_bytes()).decode("ascii")
        return f"data:{mime_type};base64,{encoded}"

    @staticmethod
    def _extract_image_url(payload: dict[str, Any]) -> str:
        images = payload.get("images")
        if not isinstance(images, list) or not images:
            raise RuntimeError("fal_missing_image_result")
        first = images[0]
        if not isinstance(first, dict) or not isinstance(first.get("url"), str):
            raise RuntimeError("fal_invalid_image_result")
        return first["url"]

    def _validate_remote_url(self, value: str) -> None:
        parsed = urlparse(value)
        if parsed.scheme != "https" or not parsed.hostname:
            raise ValueError("provider_url_invalid")
        host = parsed.hostname.lower()
        if not any(host == allowed or (allowed.startswith(".") and host.endswith(allowed)) for allowed in self.allowed_hosts):
            raise ValueError("provider_url_host_not_allowed")
