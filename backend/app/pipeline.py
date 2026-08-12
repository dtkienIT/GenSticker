from __future__ import annotations

from datetime import datetime
from typing import Protocol, runtime_checkable

from app.domain import JobSnapshot


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

