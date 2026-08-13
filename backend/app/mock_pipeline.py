from __future__ import annotations

from datetime import UTC, datetime

from app.domain import JobSnapshot, JobStatus, MockScenario
from app.pipeline import InputAssessment, InputAssessmentRequest


class MockStickerPipeline:
    """Deterministic demo pipeline that never reads or transforms source bytes."""

    mode = "mock"
    is_mock = True
    output_count = 8

    def __init__(self, stage_seconds: float) -> None:
        self.stage_seconds = stage_seconds

    def snapshot(
        self,
        *,
        created_at: str,
        scenario: str,
        now: datetime | None = None,
    ) -> JobSnapshot:
        current = now or datetime.now(UTC)
        started = datetime.fromisoformat(created_at)
        if started.tzinfo is None:
            started = started.replace(tzinfo=UTC)
        elapsed = max(0.0, (current - started).total_seconds())
        step = self.stage_seconds

        if step > 0 and elapsed < step:
            return JobSnapshot(JobStatus.QUEUED, "queued", 5)
        if step > 0 and elapsed < step * 2:
            progress = 15 + int(45 * ((elapsed - step) / step))
            return JobSnapshot(JobStatus.GENERATING, "generating", progress)
        if step > 0 and elapsed < step * 3:
            progress = 65 + int(25 * ((elapsed - step * 2) / step))
            return JobSnapshot(JobStatus.MODERATING, "moderating_outputs", progress)

        selected = MockScenario(scenario)
        if selected is MockScenario.FAILURE:
            return JobSnapshot(
                JobStatus.FAILED,
                "failed",
                100,
                "GENERATION_FAILED",
            )
        if selected is MockScenario.TIMEOUT:
            return JobSnapshot(
                JobStatus.TIMED_OUT,
                "timed_out",
                100,
                "GENERATION_TIMEOUT",
            )
        if selected is MockScenario.BLOCKED:
            return JobSnapshot(
                JobStatus.FAILED,
                "blocked",
                100,
                "OUTPUT_BLOCKED",
            )
        return JobSnapshot(JobStatus.SUCCEEDED, "ready", 100)

    def render_placeholder(self, *, ordinal: int, job_id: str) -> bytes:
        if ordinal < 1 or ordinal > self.output_count:
            raise ValueError("Mock sticker ordinal must be between 1 and 8")
        hue = (ordinal * 43) % 360
        svg = f"""<svg xmlns="http://www.w3.org/2000/svg"
  width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="hsl({hue} 75% 88%)"/>
  <circle cx="256" cy="220" r="138" fill="hsl({hue} 70% 62%)"
    stroke="#fff" stroke-width="18"/>
  <circle cx="210" cy="195" r="16" fill="#202124"/>
  <circle cx="302" cy="195" r="16" fill="#202124"/>
  <path d="M190 258 Q256 318 322 258" fill="none" stroke="#202124"
    stroke-width="16" stroke-linecap="round"/>
  <text x="256" y="410" text-anchor="middle" font-family="sans-serif"
    font-size="46" font-weight="700" fill="#202124">MOCK {ordinal}</text>
  <text x="256" y="454" text-anchor="middle" font-family="monospace"
    font-size="18" fill="#4b5563">demo placeholder</text>
</svg>"""
        return svg.encode("utf-8")

    def output_ordinals(self, *, scenario: str) -> tuple[int, ...]:
        selected = MockScenario(scenario)
        if selected is MockScenario.PARTIAL_SIX:
            return tuple(range(1, 7))
        if selected is MockScenario.PARTIAL_SEVEN:
            return tuple(range(1, 8))
        return tuple(range(1, self.output_count + 1))

    async def assess_input(self, request: InputAssessmentRequest) -> InputAssessment:
        return InputAssessment(
            passed=request.mime_type
            in {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"},
            subject_type="person",
            reason_code=None,
        )

    async def create_canonical(self, request: object) -> dict[str, object]:
        return {"mode": "mock", "request": request, "quality_passed": True}

    async def generate_sheet(self, request: object) -> dict[str, object]:
        return {
            "mode": "mock",
            "request": request,
            "layout": "4x2",
            "candidates": tuple(range(1, self.output_count + 1)),
        }

    async def assess_outputs(self, request: object) -> dict[str, object]:
        candidates = request.get("candidates", ()) if isinstance(request, dict) else ()
        published = tuple(int(value) for value in candidates if 1 <= int(value) <= 8)
        return {
            "published_ordinals": published,
            "rejected_count": self.output_count - len(published),
            "moderation_version": "mock-v1",
        }
