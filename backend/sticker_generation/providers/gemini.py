from __future__ import annotations

import base64
import binascii
import mimetypes
import re
import time
from pathlib import Path

import httpx

from sticker_generation.models import ImageGenerationRequest, ImageGenerationResult


class GeminiImageProvider:
    """Gemini native image-generation adapter using the public REST API."""

    def __init__(
        self,
        *,
        api_key: str,
        model_id: str = "gemini-2.5-flash-image",
        client: httpx.AsyncClient | None = None,
        base_url: str = "https://generativelanguage.googleapis.com/v1beta/models",
        timeout_seconds: float = 180.0,
        max_reference_bytes: int = 10 * 1024 * 1024,
        max_output_bytes: int = 20 * 1024 * 1024,
        estimated_cost_per_image_usd: float = 0.039,
    ) -> None:
        if not api_key.strip():
            raise ValueError("gemini_api_key_required")
        if not re.fullmatch(r"[A-Za-z0-9._-]+", model_id):
            raise ValueError("gemini_model_id_invalid")
        self.api_key = api_key
        self.model_id = model_id
        self.base_url = base_url.rstrip("/")
        self.max_reference_bytes = max_reference_bytes
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
        parts: list[dict[str, object]] = [{"text": prompt}]
        parts.extend(self._inline_image(path) for path in request.reference_images)
        payload = {
            "contents": [{"role": "user", "parts": parts}],
            "generationConfig": {"responseModalities": ["TEXT", "IMAGE"]},
        }
        response = await self.client.post(
            f"{self.base_url}/{self.model_id}:generateContent",
            headers={
                "x-goog-api-key": self.api_key,
                "Content-Type": "application/json",
            },
            json=payload,
        )
        if response.status_code == 429:
            raise RuntimeError("gemini_quota_or_billing_required")
        if response.status_code in {401, 403}:
            raise RuntimeError("gemini_api_key_or_permission_invalid")
        response.raise_for_status()
        image_bytes = self._extract_image(response.json())
        if len(image_bytes) > self.max_output_bytes:
            raise ValueError("provider_output_too_large")
        return ImageGenerationResult(
            image_bytes=image_bytes,
            provider="gemini",
            model=self.model_id,
            request_id=response.headers.get("x-request-id"),
            latency_seconds=time.perf_counter() - started,
            estimated_cost_usd=self.estimated_cost_per_image_usd,
        )

    def _inline_image(self, path: Path) -> dict[str, object]:
        path = Path(path)
        if not path.is_file():
            raise FileNotFoundError(f"reference_image_missing:{path}")
        if path.stat().st_size > self.max_reference_bytes:
            raise ValueError("reference_image_too_large")
        mime_type = mimetypes.guess_type(path.name)[0]
        if mime_type not in {"image/jpeg", "image/png", "image/webp"}:
            raise ValueError("reference_image_type_unsupported")
        return {
            "inlineData": {
                "mimeType": mime_type,
                "data": base64.b64encode(path.read_bytes()).decode("ascii"),
            }
        }

    @staticmethod
    def _extract_image(payload: object) -> bytes:
        if not isinstance(payload, dict):
            raise RuntimeError("gemini_invalid_response")
        candidates = payload.get("candidates")
        if not isinstance(candidates, list) or not candidates:
            raise RuntimeError("gemini_missing_image_result")
        first = candidates[0]
        if not isinstance(first, dict):
            raise RuntimeError("gemini_invalid_response")
        content = first.get("content")
        parts = content.get("parts") if isinstance(content, dict) else None
        if not isinstance(parts, list):
            raise RuntimeError("gemini_missing_image_result")
        for part in parts:
            inline = part.get("inlineData") if isinstance(part, dict) else None
            if not isinstance(inline, dict):
                continue
            mime_type = inline.get("mimeType")
            encoded = inline.get("data")
            if not isinstance(mime_type, str) or not mime_type.startswith("image/"):
                continue
            if not isinstance(encoded, str):
                continue
            try:
                return base64.b64decode(encoded, validate=True)
            except (binascii.Error, ValueError) as error:
                raise RuntimeError("gemini_invalid_image_data") from error
        raise RuntimeError("gemini_missing_image_result")
