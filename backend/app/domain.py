from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from enum import StrEnum


def utc_now() -> datetime:
    return datetime.now(UTC)


def iso_now() -> str:
    return utc_now().isoformat()


class MockScenario(StrEnum):
    SUCCESS = "success"
    FAILURE = "failure"
    TIMEOUT = "timeout"
    BLOCKED = "blocked"
    PARTIAL_SIX = "partial_six"
    PARTIAL_SEVEN = "partial_seven"


class SubjectType(StrEnum):
    PERSON = "person"
    PET = "pet"
    OBJECT = "object"


class StickerStyle(StrEnum):
    CHIBI_2D = "chibi_2d"
    CHIBI_3D = "chibi_3d"
    PLUSH = "plush"
    PIXEL = "pixel"


class JobStatus(StrEnum):
    QUEUED = "queued"
    VALIDATING = "validating"
    CANONICALIZING = "canonicalizing"
    GENERATING = "generating"
    SPLITTING = "splitting"
    QUALITY_CHECKING = "quality_checking"
    MODERATING = "moderating"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    TIMED_OUT = "timed_out"


TERMINAL_JOB_STATUSES = {
    JobStatus.SUCCEEDED.value,
    JobStatus.FAILED.value,
    JobStatus.TIMED_OUT.value,
}


@dataclass(frozen=True, slots=True)
class Principal:
    owner_id: str
    auth_mode: str


@dataclass(frozen=True, slots=True)
class JobSnapshot:
    status: JobStatus
    stage: str
    progress: int
    safe_error_code: str | None = None
