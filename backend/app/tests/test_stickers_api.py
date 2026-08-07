from __future__ import annotations

import inspect
from datetime import datetime, timezone
from io import BytesIO

import httpx
import pytest
import pytest_asyncio
from PIL import Image

from app.api.stickers import retry_failed_sheet
from app.config import settings
from app.main import app
from app.models.schemas import ProcessStepProgress, StickerJobResponse
from app.security import require_user_id
from app.services.sticker_pipeline import StickerPipelineService, job_attempts, job_owners, job_store


def _png_bytes() -> bytes:
    buffer = BytesIO()
    Image.new("RGB", (32, 32), "white").save(buffer, format="PNG")
    return buffer.getvalue()


def _job(job_id: str = "job_test") -> StickerJobResponse:
    return StickerJobResponse(
        job_id=job_id,
        status="processing",
        current_step=1,
        progress_percentage=0,
        steps=[
            ProcessStepProgress(
                id=1,
                step_name="Normalize",
                description="Validate image",
                status="processing",
                progress=0,
            )
        ],
        created_at=datetime.now(timezone.utc).replace(tzinfo=None),
    )


@pytest.fixture(autouse=True)
def _clean_state() -> None:
    job_store.clear()
    job_owners.clear()
    job_attempts.clear()
    app.dependency_overrides.clear()
    yield
    job_store.clear()
    job_owners.clear()
    job_attempts.clear()
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def client():
    transport = httpx.ASGITransport(app=app, client=("127.0.0.1", 50000))
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as api:
        yield api


@pytest.mark.asyncio
async def test_generate_requires_bearer_before_starting_job(
    client: httpx.AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls = 0

    def fake_create_job(**_: object) -> StickerJobResponse:
        nonlocal calls
        calls += 1
        return _job()

    monkeypatch.setattr(StickerPipelineService, "create_job", fake_create_job)
    response = await client.post(
        "/api/v1/stickers/generate",
        files={"file": ("portrait.png", _png_bytes(), "image/png")},
        data={"style_id": "anime-kawaii"},
    )

    assert response.status_code == 401
    assert calls == 0


@pytest.mark.asyncio
async def test_local_demo_token_is_limited_to_development_loopback(
    client: httpx.AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "APP_ENV", "development")
    monkeypatch.setattr(settings, "ALLOW_LOCAL_DEMO_AUTH", True)
    response = await client.post(
        "/api/v1/stickers/generate",
        headers={"Authorization": "Bearer local-dev-only"},
        files={"file": ("portrait.png", b"not-an-image", "image/png")},
        data={"style_id": "anime-kawaii"},
    )
    assert response.status_code == 415

    monkeypatch.setattr(settings, "APP_ENV", "production")
    response = await client.post(
        "/api/v1/stickers/generate",
        headers={"Authorization": "Bearer local-dev-only"},
        files={"file": ("portrait.png", b"not-an-image", "image/png")},
        data={"style_id": "anime-kawaii"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_generate_rejects_spoofed_image_before_starting_job(
    client: httpx.AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app.dependency_overrides[require_user_id] = lambda: "user-a"
    calls = 0

    def fake_create_job(**_: object) -> StickerJobResponse:
        nonlocal calls
        calls += 1
        return _job()

    monkeypatch.setattr(StickerPipelineService, "create_job", fake_create_job)
    response = await client.post(
        "/api/v1/stickers/generate",
        files={"file": ("portrait.png", b"not-an-image", "image/png")},
        data={"style_id": "anime-kawaii"},
    )

    assert response.status_code == 415
    assert calls == 0


@pytest.mark.asyncio
async def test_generate_passes_authenticated_owner_to_job(
    client: httpx.AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app.dependency_overrides[require_user_id] = lambda: "user-a"
    captured: dict[str, object] = {}

    def fake_create_job(**kwargs: object) -> StickerJobResponse:
        captured.update(kwargs)
        return _job()

    monkeypatch.setattr(StickerPipelineService, "create_job", fake_create_job)
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "test-key")
    response = await client.post(
        "/api/v1/stickers/generate",
        files={"file": ("portrait.png", _png_bytes(), "image/png")},
        data={"style_id": "anime-kawaii"},
    )

    assert response.status_code == 200
    assert captured["owner_id"] == "user-a"


@pytest.mark.asyncio
async def test_user_cannot_poll_another_users_job(client: httpx.AsyncClient) -> None:
    app.dependency_overrides[require_user_id] = lambda: "user-b"
    job_store["job_private"] = _job("job_private")
    job_owners["job_private"] = "user-a"

    response = await client.get("/api/v1/stickers/jobs/job_private")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_owner_can_poll_preview_without_response_caching(
    client: httpx.AsyncClient,
) -> None:
    app.dependency_overrides[require_user_id] = lambda: "user-a"
    job = _job("job_preview")
    job.status = "error"
    job.preview_image_url = "data:image/png;base64,cHJldmlldw=="
    job.quality_status = "rejected"
    job_store[job.job_id] = job
    job_owners[job.job_id] = "user-a"

    response = await client.get("/api/v1/stickers/jobs/job_preview")

    assert response.status_code == 200
    assert response.json()["preview_image_url"] == job.preview_image_url
    assert response.headers["cache-control"] == "no-store, private"


@pytest.mark.asyncio
async def test_retry_passes_authenticated_owner_to_service(
    client: httpx.AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app.dependency_overrides[require_user_id] = lambda: "user-a"
    captured: dict[str, str] = {}

    def fake_retry(job_id: str, *, owner_id: str) -> StickerJobResponse:
        captured.update(job_id=job_id, owner_id=owner_id)
        return _job(job_id)

    monkeypatch.setattr(StickerPipelineService, "retry_job", fake_retry)
    response = await client.post("/api/v1/stickers/jobs/job_failed/retry")

    assert response.status_code == 200
    assert captured == {"job_id": "job_failed", "owner_id": "user-a"}


def test_retry_endpoint_runs_on_the_event_loop() -> None:
    assert inspect.iscoroutinefunction(retry_failed_sheet)


@pytest.mark.asyncio
async def test_whitespace_key_returns_503_without_starting_job(
    client: httpx.AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    app.dependency_overrides[require_user_id] = lambda: "user-a"
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "   ")
    calls = 0

    def fake_create_job(**_: object) -> StickerJobResponse:
        nonlocal calls
        calls += 1
        return _job()

    monkeypatch.setattr(StickerPipelineService, "create_job", fake_create_job)
    response = await client.post(
        "/api/v1/stickers/generate",
        files={"file": ("portrait.png", _png_bytes(), "image/png")},
        data={"style_id": "anime-kawaii"},
    )

    assert response.status_code == 503
    assert calls == 0
