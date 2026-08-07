from __future__ import annotations

from typing import Protocol

from sticker_generation.models import ImageGenerationRequest, ImageGenerationResult


class ImageProvider(Protocol):
    async def generate(self, request: ImageGenerationRequest) -> ImageGenerationResult:
        """Generate one image from text and ordered reference images."""
