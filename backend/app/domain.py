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


class JobStatus(StrEnum):
    QUEUED = "queued"
    GENERATING = "generating"
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

