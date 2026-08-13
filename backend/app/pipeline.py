from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Protocol, runtime_checkable

from app.domain import JobSnapshot

TARGET_OUTPUTS = 8
MIN_PUBLISHABLE_OUTPUTS = 6


def validate_publishable_ordinals(ordinals) -> tuple[int, ...]:
    values = tuple(int(value) for value in ordinals)
    if not MIN_PUBLISHABLE_OUTPUTS <= len(values) <= TARGET_OUTPUTS:
        raise ValueError("A publishable pack requires 6-8 stickers")
    if len(set(values)) != len(values) or any(
        value < 1 or value > TARGET_OUTPUTS for value in values
    ):
        raise ValueError("Sticker ordinals must be unique values from 1 through 8")
    if 1 not in values:
        raise ValueError("The primary greeting slot is required")
    return values


@dataclass(frozen=True, slots=True)
class InputAssessmentRequest:
    source_id: str
    mime_type: str


@dataclass(frozen=True, slots=True)
class InputAssessment:
    passed: bool
    subject_type: str
    reason_code: str | None = None


@runtime_checkable
class StickerPipelinePort(Protocol):
    async def assess_input(self, request: InputAssessmentRequest) -> InputAssessment: ...
    async def create_canonical(self, request: object) -> object: ...
    async def generate_sheet(self, request: object) -> object: ...
    async def assess_outputs(self, request: object) -> object: ...


@runtime_checkable
class StickerPipeline(Protocol):
    """Small contract used by the current persistence adapters.

    Only the mock implementation exists in this MVP. A real AI/image-processing
    integration must implement and validate this boundary before production use.
    """

    @property
    def mode(self) -> str: ...

    @property
    def is_mock(self) -> bool: ...

    @property
    def output_count(self) -> int: ...

    def snapshot(
        self,
        *,
        created_at: str,
        scenario: str,
        now: datetime | None = None,
    ) -> JobSnapshot: ...

    def render_placeholder(self, *, ordinal: int, job_id: str) -> bytes: ...

    def output_ordinals(self, *, scenario: str) -> tuple[int, ...]: ...
