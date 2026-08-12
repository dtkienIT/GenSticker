from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app


@pytest.fixture
def settings(tmp_path: Path) -> Settings:
    return Settings(
        app_env="test",
        data_backend="local",
        local_database_path=tmp_path / "gensticker.sqlite3",
        local_asset_root=tmp_path / "assets",
        allow_local_demo_auth=True,
        mock_stage_seconds=0,
        max_upload_bytes=1024 * 1024,
    )


@pytest.fixture
def client(settings: Settings) -> Iterator[TestClient]:
    with TestClient(create_app(settings)) as test_client:
        yield test_client


@pytest.fixture
def device_headers() -> dict[str, str]:
    return {"X-Device-ID": "test-device-alpha"}


@pytest.fixture
def other_device_headers() -> dict[str, str]:
    return {"X-Device-ID": "test-device-bravo"}


@pytest.fixture
def png_bytes() -> bytes:
    # Technical-signature fixture only. The mock pipeline never decodes it.
    return b"\x89PNG\r\n\x1a\n" + b"demo-source-bytes"


def upload_source(
    client: TestClient,
    headers: dict[str, str],
    content: bytes,
    *,
    consent_accepted: str = "true",
):
    return client.post(
        "/api/v1/source-images",
        headers=headers,
        files={"file": ("private-name.png", content, "image/png")},
        data={
            "consent_accepted": consent_accepted,
            "consent_version": "demo-v1",
        },
    )
