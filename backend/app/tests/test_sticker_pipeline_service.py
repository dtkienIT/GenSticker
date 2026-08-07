from __future__ import annotations

import asyncio
import shutil
from datetime import timedelta
from pathlib import Path

import pytest
from PIL import Image

from app.config import settings
from app.services import sticker_pipeline as pipeline_module
from app.services.sticker_pipeline import (
    StickerPipelineService,
    job_artifacts,
    job_attempts,
    job_contexts,
    job_owners,
    job_retries,
    job_store,
)


@pytest.fixture(autouse=True)
def _clean_jobs() -> None:
    job_store.clear()
    job_owners.clear()
    job_attempts.clear()
    job_contexts.clear()
    job_retries.clear()
    yield
    for artifact_dir in job_artifacts.values():
        shutil.rmtree(artifact_dir, ignore_errors=True)
    job_artifacts.clear()
    job_store.clear()
    job_owners.clear()
    job_attempts.clear()
    job_contexts.clear()
    job_retries.clear()


def _discard_task(coroutine):  # type: ignore[no-untyped-def]
    coroutine.close()
    return None


def test_create_job_tracks_owner_and_blocks_duplicate(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "test-key")
    monkeypatch.setattr(asyncio, "create_task", _discard_task)

    job = StickerPipelineService.create_job(
        owner_id="user-a",
        style_id="anime-kawaii",
        file_bytes=b"image",
        filename="portrait.png",
        content_type="image/png",
    )

    assert job_owners[job.job_id] == "user-a"
    assert StickerPipelineService.get_job(job.job_id, owner_id="user-a") is job
    assert StickerPipelineService.get_job(job.job_id, owner_id="user-b") is None
    with pytest.raises(ValueError, match="generation_already_in_progress"):
        StickerPipelineService.create_job(
            owner_id="user-a",
            style_id="anime-kawaii",
            file_bytes=b"image",
            filename="portrait.png",
            content_type="image/png",
        )


@pytest.mark.asyncio
async def test_pipeline_completes_and_builds_twenty_stickers(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "test-key")
    monkeypatch.setattr(asyncio, "create_task", _discard_task)
    job = StickerPipelineService.create_job(
        owner_id="user-a",
        style_id="anime-kawaii",
        file_bytes=b"input-image",
        filename="portrait.png",
        content_type="image/png",
    )

    class FakeProvider:
        closed = False

        def __init__(self, **_: object) -> None:
            pass

        async def close(self) -> None:
            self.closed = True

    class FakeGenerator:
        def __init__(self, **_: object) -> None:
            pass

        async def generate(self, *, output_dir: Path, on_progress, on_sheet, **_: object):  # type: ignore[no-untyped-def]
            output_dir.mkdir(parents=True, exist_ok=True)
            on_progress("identity", 1, 1)
            on_progress("canonical", 1, 1)
            paths = []
            for index in range(20):
                path = output_dir / f"{index:02d}.png"
                Image.new("RGBA", (8, 8), "white").save(path)
                paths.append(path)
            on_sheet(b"temporary-raw-sheet-1")
            on_sheet(b"temporary-raw-sheet-2")
            on_progress("groups", 3, 3)
            return tuple(paths)

    monkeypatch.setattr(pipeline_module, "OpenAIImageProvider", FakeProvider)
    monkeypatch.setattr(pipeline_module, "GroupedStickerGenerator", FakeGenerator)

    await StickerPipelineService._run_pipeline_async(
        job_id=job.job_id,
        style_id="anime-kawaii",
        file_bytes=b"input-image",
        filename="portrait.png",
        content_type="image/png",
    )

    assert job.status == "completed"
    assert job.progress_percentage == 100
    assert job.stickers is not None and len(job.stickers) == 20
    assert all(item.image_url.startswith("data:image/png;base64,") for item in job.stickers)
    assert len(job.preview_image_urls) == 2
    assert job.preview_image_url == job.preview_image_urls[-1]
    assert job.quality_status == "accepted"


@pytest.mark.asyncio
async def test_pipeline_sanitizes_provider_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "test-key")
    monkeypatch.setattr(asyncio, "create_task", _discard_task)
    job = StickerPipelineService.create_job(
        owner_id="user-a",
        style_id="anime-kawaii",
        file_bytes=b"input-image",
        filename="portrait.png",
        content_type="image/png",
    )

    class FakeProvider:
        def __init__(self, **_: object) -> None:
            pass

        async def close(self) -> None:
            return None

    class FailingGenerator:
        def __init__(self, **_: object) -> None:
            pass

        async def generate(self, **_: object):  # type: ignore[no-untyped-def]
            raise RuntimeError("openai_quota_or_billing_required")

    monkeypatch.setattr(pipeline_module, "OpenAIImageProvider", FakeProvider)
    monkeypatch.setattr(pipeline_module, "GroupedStickerGenerator", FailingGenerator)

    await StickerPipelineService._run_pipeline_async(
        job_id=job.job_id,
        style_id="anime-kawaii",
        file_bytes=b"input-image",
        filename="portrait.png",
        content_type="image/png",
    )

    assert job.status == "error"
    assert job.error_message is not None
    assert "quota" in job.error_message.lower()
    assert "test-key" not in job.error_message


@pytest.mark.asyncio
async def test_quality_rejection_keeps_raw_sheet_preview(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "test-key")
    monkeypatch.setattr(asyncio, "create_task", _discard_task)
    job = StickerPipelineService.create_job(
        owner_id="user-a",
        style_id="anime-kawaii",
        file_bytes=b"input-image",
        filename="portrait.png",
        content_type="image/png",
    )

    class FakeProvider:
        def __init__(self, **_: object) -> None:
            pass

        async def close(self) -> None:
            return None

    class RejectingGenerator:
        def __init__(self, **_: object) -> None:
            pass

        async def generate(self, *, on_sheet, **_: object):  # type: ignore[no-untyped-def]
            on_sheet(b"raw-png-result")
            raise ValueError("pack_sheet_grid_not_detected")

    monkeypatch.setattr(pipeline_module, "OpenAIImageProvider", FakeProvider)
    monkeypatch.setattr(pipeline_module, "GroupedStickerGenerator", RejectingGenerator)

    await StickerPipelineService._run_pipeline_async(
        job_id=job.job_id,
        style_id="anime-kawaii",
        file_bytes=b"input-image",
        filename="portrait.png",
        content_type="image/png",
    )

    assert job.status == "error"
    assert job.quality_status == "rejected"
    assert job.preview_image_url == "data:image/png;base64,cmF3LXBuZy1yZXN1bHQ="
    assert job.preview_image_urls == [job.preview_image_url]
    assert job.error_message is not None
    assert "bố cục" in job.error_message.lower()


@pytest.mark.asyncio
async def test_provider_constructor_failure_marks_job_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "test-key")
    monkeypatch.setattr(asyncio, "create_task", _discard_task)
    job = StickerPipelineService.create_job(
        owner_id="user-a",
        style_id="anime-kawaii",
        file_bytes=b"input-image",
        filename="portrait.png",
        content_type="image/png",
    )

    class FailingProvider:
        def __init__(self, **_: object) -> None:
            raise RuntimeError("private provider initialization details")

    monkeypatch.setattr(pipeline_module, "OpenAIImageProvider", FailingProvider)
    await StickerPipelineService._run_pipeline_async(
        job_id=job.job_id,
        style_id="anime-kawaii",
        file_bytes=b"input-image",
        filename="portrait.png",
        content_type="image/png",
    )

    assert job.status == "error"
    assert "private provider" not in (job.error_message or "")


def test_rate_limit_and_ttl_cleanup(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "test-key")
    monkeypatch.setattr(settings, "GENERATION_RATE_LIMIT_PER_HOUR", 1)
    monkeypatch.setattr(settings, "JOB_TTL_SECONDS", 60)
    monkeypatch.setattr(asyncio, "create_task", _discard_task)
    job = StickerPipelineService.create_job(
        owner_id="user-a",
        style_id="anime-kawaii",
        file_bytes=b"input-image",
        filename="portrait.png",
        content_type="image/png",
    )
    job.status = "completed"
    with pytest.raises(ValueError, match="generation_rate_limit_exceeded"):
        StickerPipelineService.create_job(
            owner_id="user-a",
            style_id="anime-kawaii",
            file_bytes=b"input-image",
            filename="portrait.png",
            content_type="image/png",
        )

    job.created_at -= timedelta(minutes=2)
    assert StickerPipelineService.get_job(job.job_id, owner_id="user-a") is None
    assert job.job_id not in job_owners


def test_completed_job_store_evicts_oldest_over_retention_cap(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "test-key")
    monkeypatch.setattr(settings, "MAX_RETAINED_JOBS", 1)
    monkeypatch.setattr(asyncio, "create_task", _discard_task)

    first = StickerPipelineService.create_job(
        owner_id="user-a",
        style_id="anime-kawaii",
        file_bytes=b"image",
        filename="portrait.png",
        content_type="image/png",
    )
    first.status = "completed"
    first.created_at -= timedelta(seconds=1)
    second = StickerPipelineService.create_job(
        owner_id="user-b",
        style_id="anime-kawaii",
        file_bytes=b"image",
        filename="portrait.png",
        content_type="image/png",
    )
    second.status = "completed"

    assert StickerPipelineService.get_job(second.job_id, owner_id="user-b") is second
    assert first.job_id not in job_store
    assert first.job_id not in job_owners


@pytest.mark.asyncio
async def test_retry_resumes_from_private_artifacts_without_new_canonical(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "test-key")
    monkeypatch.setattr(asyncio, "create_task", _discard_task)
    job = StickerPipelineService.create_job(
        owner_id="user-a",
        style_id="anime-kawaii",
        file_bytes=b"input-image",
        filename="portrait.png",
        content_type="image/png",
    )
    job.status = "error"
    job.quality_status = "rejected"

    retried = StickerPipelineService.retry_job(job.job_id, owner_id="user-a")

    assert retried is job
    assert job.status == "processing"
    assert job_retries[job.job_id] == 1
    assert job_artifacts[job.job_id].is_dir()
    with pytest.raises(ValueError, match="job_not_found"):
        StickerPipelineService.retry_job(job.job_id, owner_id="user-b")


def test_retry_respects_generation_rate_limit(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "test-key")
    monkeypatch.setattr(settings, "GENERATION_RATE_LIMIT_PER_HOUR", 1)
    monkeypatch.setattr(asyncio, "create_task", _discard_task)
    job = StickerPipelineService.create_job(
        owner_id="user-a",
        style_id="anime-kawaii",
        file_bytes=b"input-image",
        filename="portrait.png",
        content_type="image/png",
    )
    job.status = "error"
    job.quality_status = "rejected"

    with pytest.raises(ValueError, match="generation_rate_limit_exceeded"):
        StickerPipelineService.retry_job(job.job_id, owner_id="user-a")
