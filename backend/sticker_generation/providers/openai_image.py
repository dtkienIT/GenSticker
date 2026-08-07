from __future__ import annotations

import base64
import binascii
import mimetypes
import re
import time
from pathlib import Path

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
        for path in request.reference_images:
            filename, data, mime_type = self._read_image(path)
            total_bytes += len(data)
            if total_bytes > self.max_total_reference_bytes:
                raise ValueError("reference_images_too_large")
            files.append(("image[]", (filename, data, mime_type)))

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
            },
            files=files,
        )
        if response.status_code == 429:
            raise RuntimeError("openai_quota_or_billing_required")
        if response.status_code in {401, 403}:
            raise RuntimeError("openai_api_key_or_permission_invalid")
        response.raise_for_status()
        image_bytes = self._extract_image(response.json())
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

    @staticmethod
    def _extract_image(payload: object) -> bytes:
        if not isinstance(payload, dict):
            raise RuntimeError("openai_invalid_response")
        data = payload.get("data")
        if not isinstance(data, list) or not data:
            raise RuntimeError("openai_missing_image_result")
        first = data[0]
        encoded = first.get("b64_json") if isinstance(first, dict) else None
        if not isinstance(encoded, str):
            raise RuntimeError("openai_invalid_image_result")
        try:
            return base64.b64decode(encoded, validate=True)
        except (binascii.Error, ValueError) as error:
            raise RuntimeError("openai_invalid_image_data") from error
