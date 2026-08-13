from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.domain import MockScenario, StickerStyle, SubjectType
from app.pipeline import MIN_PUBLISHABLE_OUTPUTS, TARGET_OUTPUTS


class ValidationResultResponse(BaseModel):
    kind: Literal["technical", "subject", "input_moderation"]
    status: Literal["passed", "failed", "mocked"]
    safe_reason_code: str | None = None
    provider_version: str


class ConsentResponse(BaseModel):
    version: str
    accepted_at: datetime


class SourceResponse(BaseModel):
    id: str
    status: Literal["ready", "rejected"]
    mime_type: str
    byte_size: int
    created_at: datetime
    expires_at: datetime
    consent: ConsentResponse
    validation_mode: Literal["mock"] = "mock"
    validation_results: list[ValidationResultResponse]
    subject_type: SubjectType = SubjectType.PERSON


class JobCreateRequest(BaseModel):
    source_image_id: str
    style_id: StickerStyle = StickerStyle.CHIBI_3D
    locale: Literal["vi", "en"] = "vi"
    catalog_version: Literal["v1"] = "v1"
    mock_scenario: MockScenario = MockScenario.SUCCESS


class RegenerateRequest(BaseModel):
    mock_scenario: MockScenario = MockScenario.SUCCESS


class JobResponse(BaseModel):
    id: str
    source_image_id: str
    regenerated_from_job_id: str | None = None
    style_id: StickerStyle = StickerStyle.CHIBI_3D
    locale: Literal["vi", "en"] = "vi"
    catalog_version: Literal["v1"] = "v1"
    status: Literal[
        "queued",
        "validating",
        "canonicalizing",
        "generating",
        "splitting",
        "quality_checking",
        "moderating",
        "succeeded",
        "failed",
        "timed_out",
    ]
    stage: str
    progress: int = Field(ge=0, le=100)
    safe_error_code: str | None = None
    sticker_set_id: str | None = None
    mocked: bool
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None = None


class JobListResponse(BaseModel):
    items: list[JobResponse]


class StickerResponse(BaseModel):
    id: str
    ordinal: int = Field(ge=1, le=8)
    expression_key: str
    mime_type: str
    moderation_status: Literal["passed"]
    asset_url: str
    created_at: datetime


class StickerSetResponse(BaseModel):
    id: str
    job_id: str
    style: StickerStyle
    subject_type: SubjectType = SubjectType.PERSON
    locale: Literal["vi", "en"] = "vi"
    catalog_version: Literal["v1"] = "v1"
    target_count: Literal[8] = TARGET_OUTPUTS
    published_count: int = Field(
        default=TARGET_OUTPUTS, ge=MIN_PUBLISHABLE_OUTPUTS, le=TARGET_OUTPUTS
    )
    rejected_count: int = Field(default=0, ge=0, le=2)
    status: Literal["preview"]
    mocked: bool
    created_at: datetime
    stickers: list[StickerResponse]

    @field_validator("stickers")
    @classmethod
    def require_publishable_count(cls, value: list[StickerResponse]) -> list[StickerResponse]:
        if not MIN_PUBLISHABLE_OUTPUTS <= len(value) <= TARGET_OUTPUTS:
            raise ValueError("stickers must contain 6-8 moderated outputs")
        if len({item.ordinal for item in value}) != len(value):
            raise ValueError("sticker ordinals must be unique")
        return value


class SaveSetRequest(BaseModel):
    sticker_ids: list[str] = Field(min_length=1, max_length=8)

    @field_validator("sticker_ids")
    @classmethod
    def reject_duplicate_ids(cls, value: list[str]) -> list[str]:
        if len(value) != len(set(value)):
            raise ValueError("sticker_ids must be unique")
        return value


class SavedStickerResponse(BaseModel):
    id: str
    ordinal: int = Field(ge=1, le=8)
    source_ordinal: int = Field(ge=1, le=8)
    expression_key: str
    mime_type: str
    moderation_status: Literal["passed"]
    asset_url: str
    created_at: datetime


class SavedPackResponse(BaseModel):
    id: str
    source_set_id: str
    title: str
    created_at: datetime
    sticker_count: int = Field(ge=1, le=8)
    stickers: list[SavedStickerResponse]


class SavedPackListResponse(BaseModel):
    items: list[SavedPackResponse]


class HealthResponse(BaseModel):
    status: Literal["ok", "not_ready"]


class ProblemResponse(BaseModel):
    type: str
    title: str
    status: int
    code: str
    detail: str
    retryable: bool
    request_id: str
