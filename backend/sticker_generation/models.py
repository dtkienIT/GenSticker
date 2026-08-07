from __future__ import annotations

from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class StickerTemplate(BaseModel):
    model_config = ConfigDict(frozen=True)

    template_id: str = Field(min_length=1)
    display_order: int = Field(ge=1, le=20)
    label: str = Field(min_length=1)
    pose_prompt: str = Field(min_length=1)
    emotion_prompt: str = Field(min_length=1)
    decorative_prompt: str = Field(min_length=1)
    negative_prompt: str = Field(min_length=1)
    reference_filename: str = Field(min_length=1)


class ImageGenerationRequest(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True, frozen=True)

    prompt: str = Field(min_length=1)
    reference_images: tuple[Path, ...] = Field(min_length=1, max_length=14)
    negative_prompt: str = ""
    size: Literal["1024x1024", "1536x1024", "1024x1536", "auto"] = "1024x1024"
    metadata: dict[str, Any] = Field(default_factory=dict)


class ImageGenerationResult(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True, frozen=True)

    image_bytes: bytes = Field(min_length=1)
    image_url: str | None = None
    provider: str = Field(min_length=1)
    model: str = Field(min_length=1)
    request_id: str | None = None
    latency_seconds: float = Field(ge=0.0)
    estimated_cost_usd: float = Field(ge=0.0, default=0.0)


class StickerPackItem(BaseModel):
    model_config = ConfigDict(frozen=True)

    template_id: str
    label: str
    output_path: str
    sha256: str
    provider: str
    model: str
    request_id: str | None
    attempts: int = Field(ge=1)
    latency_seconds: float = Field(ge=0.0)
    estimated_cost_usd: float = Field(ge=0.0)
    attempt_errors: tuple[str, ...] = ()


class StickerPackResult(BaseModel):
    model_config = ConfigDict(frozen=True)

    output_dir: str
    items: tuple[StickerPackItem, ...]
    manifest_path: str
    contact_sheet_path: str | None = None
