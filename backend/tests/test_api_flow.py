from __future__ import annotations

import sqlite3
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app
from tests.conftest import upload_source


def test_health_and_authentication(
    client: TestClient, png_bytes: bytes
) -> None:
    assert client.get("/health/live").json() == {"status": "ok"}
    assert client.get("/health/ready").json() == {"status": "ok"}

    response = upload_source(client, {}, png_bytes)
    assert response.status_code == 401
    assert response.headers["content-type"].startswith("application/problem+json")
    assert response.json()["code"] == "AUTH_REQUIRED"
    assert response.json()["request_id"]


def test_complete_private_flow(
    client: TestClient,
    device_headers: dict[str, str],
    other_device_headers: dict[str, str],
    png_bytes: bytes,
) -> None:
    source_response = upload_source(client, device_headers, png_bytes)
    assert source_response.status_code == 201
    source = source_response.json()
    assert source["status"] == "ready"
    assert source["validation_mode"] == "mock"
    assert {item["status"] for item in source["validation_results"]} == {
        "passed",
        "mocked",
    }

    assert (
        client.get(
            f"/api/v1/source-images/{source['id']}", headers=other_device_headers
        ).status_code
        == 404
    )

    job_response = client.post(
        "/api/v1/generation-jobs",
        headers={**device_headers, "Idempotency-Key": "create-job-0001"},
        json={"source_image_id": source["id"]},
    )
    assert job_response.status_code == 202
    job = job_response.json()
    assert job["status"] == "succeeded"
    assert job["sticker_set_id"]
    assert job["mocked"] is True

    sticker_set_response = client.get(
        f"/api/v1/sticker-sets/{job['sticker_set_id']}", headers=device_headers
    )
    assert sticker_set_response.status_code == 200
    sticker_set = sticker_set_response.json()
    assert sticker_set["style"] == "chibi_3d"
    assert len(sticker_set["stickers"]) == 8
    assert [item["ordinal"] for item in sticker_set["stickers"]] == list(range(1, 9))

    selected = [item["id"] for item in sticker_set["stickers"][:3]]
    save_response = client.post(
        f"/api/v1/sticker-sets/{sticker_set['id']}/save",
        headers={**device_headers, "Idempotency-Key": "save-pack-000001"},
        json={"sticker_ids": selected},
    )
    assert save_response.status_code == 201
    pack = save_response.json()
    assert pack["sticker_count"] == 3
    assert [item["id"] for item in pack["stickers"]] == selected

    asset_url = pack["stickers"][0]["asset_url"]
    asset_response = client.get(asset_url, headers=device_headers)
    assert asset_response.status_code == 200
    assert asset_response.headers["content-type"].startswith("image/svg+xml")
    assert asset_response.headers["cache-control"] == "private, no-store"
    assert b"MOCK 1" in asset_response.content
    assert client.get(asset_url, headers=other_device_headers).status_code == 404

    packs = client.get("/api/v1/saved-packs", headers=device_headers).json()["items"]
    assert [item["id"] for item in packs] == [pack["id"]]
    pack_path = f"/api/v1/saved-packs/{pack['id']}"
    assert client.get(pack_path, headers=device_headers).status_code == 200
    assert client.delete(pack_path, headers=device_headers).status_code == 204
    assert client.get(pack_path, headers=device_headers).status_code == 404


def test_regenerate_creates_new_full_set(
    client: TestClient,
    device_headers: dict[str, str],
    png_bytes: bytes,
) -> None:
    source = upload_source(client, device_headers, png_bytes).json()
    original = client.post(
        "/api/v1/generation-jobs",
        headers={**device_headers, "Idempotency-Key": "create-job-regen"},
        json={"source_image_id": source["id"]},
    ).json()
    regenerated = client.post(
        f"/api/v1/generation-jobs/{original['id']}/regenerate",
        headers={**device_headers, "Idempotency-Key": "regenerate-00001"},
        json={},
    )
    assert regenerated.status_code == 202
    child = regenerated.json()
    assert child["id"] != original["id"]
    assert child["regenerated_from_job_id"] == original["id"]
    assert child["source_image_id"] == original["source_image_id"]
    assert child["sticker_set_id"] != original["sticker_set_id"]
    assert len(
        client.get(
            f"/api/v1/sticker-sets/{child['sticker_set_id']}", headers=device_headers
        ).json()["stickers"]
    ) == 8


@pytest.mark.parametrize(
    ("scenario", "status", "error_code"),
    [
        ("failure", "failed", "GENERATION_FAILED"),
        ("timeout", "timed_out", "GENERATION_TIMEOUT"),
        ("blocked", "failed", "OUTPUT_BLOCKED"),
    ],
)
def test_development_failure_scenarios_create_no_set(
    client: TestClient,
    device_headers: dict[str, str],
    png_bytes: bytes,
    scenario: str,
    status: str,
    error_code: str,
) -> None:
    source = upload_source(client, device_headers, png_bytes).json()
    response = client.post(
        "/api/v1/generation-jobs",
        headers={**device_headers, "Idempotency-Key": f"scenario-{scenario}-001"},
        json={"source_image_id": source["id"], "mock_scenario": scenario},
    )
    assert response.status_code == 202
    job = response.json()
    assert job["status"] == status
    assert job["safe_error_code"] == error_code
    assert job["sticker_set_id"] is None


def test_consent_signature_and_size_validation(
    client: TestClient,
    device_headers: dict[str, str],
    png_bytes: bytes,
) -> None:
    denied = upload_source(
        client, device_headers, png_bytes, consent_accepted="false"
    )
    assert denied.status_code == 400
    assert denied.json()["code"] == "CONSENT_REQUIRED"

    wrong_signature = client.post(
        "/api/v1/source-images",
        headers=device_headers,
        files={"file": ("not-really.png", b"plain text", "image/png")},
        data={"consent_accepted": "true", "consent_version": "demo-v1"},
    )
    assert wrong_signature.status_code == 400
    assert wrong_signature.json()["code"] == "IMAGE_SIGNATURE_MISMATCH"


def test_job_idempotency_replay_and_conflict(
    client: TestClient,
    device_headers: dict[str, str],
    png_bytes: bytes,
) -> None:
    first_source = upload_source(client, device_headers, png_bytes).json()
    second_source = upload_source(client, device_headers, png_bytes + b"2").json()
    headers = {**device_headers, "Idempotency-Key": "same-job-key-001"}
    first = client.post(
        "/api/v1/generation-jobs",
        headers=headers,
        json={"source_image_id": first_source["id"]},
    )
    replay = client.post(
        "/api/v1/generation-jobs",
        headers=headers,
        json={"source_image_id": first_source["id"]},
    )
    assert first.status_code == 202
    assert replay.status_code == 200
    assert replay.json()["id"] == first.json()["id"]

    conflict = client.post(
        "/api/v1/generation-jobs",
        headers=headers,
        json={"source_image_id": second_source["id"]},
    )
    assert conflict.status_code == 409
    assert conflict.json()["code"] == "IDEMPOTENCY_KEY_REUSED"


def test_job_resumes_from_persisted_time_after_restart(
    settings: Settings,
    device_headers: dict[str, str],
    png_bytes: bytes,
) -> None:
    slow_settings = settings.model_copy(update={"mock_stage_seconds": 60.0})
    with TestClient(create_app(slow_settings)) as first_client:
        source = upload_source(first_client, device_headers, png_bytes).json()
        job = first_client.post(
            "/api/v1/generation-jobs",
            headers={**device_headers, "Idempotency-Key": "durable-job-0001"},
            json={"source_image_id": source["id"]},
        ).json()
        assert job["status"] == "queued"

    old_time = (datetime.now(UTC) - timedelta(minutes=10)).isoformat()
    with sqlite3.connect(slow_settings.resolved_database_path) as connection:
        connection.execute(
            "UPDATE generation_jobs SET created_at = ?, updated_at = ? WHERE id = ?",
            (old_time, old_time, job["id"]),
        )

    with TestClient(create_app(slow_settings)) as restarted_client:
        resumed = restarted_client.get(
            f"/api/v1/generation-jobs/{job['id']}", headers=device_headers
        )
        assert resumed.status_code == 200
        assert resumed.json()["status"] == "succeeded"
        assert resumed.json()["sticker_set_id"]


def test_unexpected_exception_returns_redacted_problem(
    settings: Settings,
    device_headers: dict[str, str],
) -> None:
    class ExplodingRepository:
        def list_packs(self, *, owner_id: str):
            raise RuntimeError("database secret at /private/storage/path")

    with TestClient(create_app(settings), raise_server_exceptions=False) as safe_client:
        safe_client.app.state.repository = ExplodingRepository()
        response = safe_client.get("/api/v1/saved-packs", headers=device_headers)

    assert response.status_code == 500
    assert response.headers["content-type"].startswith("application/problem+json")
    problem = response.json()
    assert problem["code"] == "INTERNAL_SERVER_ERROR"
    assert problem["detail"] == "The request could not be completed."
    assert "database secret" not in response.text


def test_local_concurrent_same_key_replays_job_and_save(
    client: TestClient,
    device_headers: dict[str, str],
    png_bytes: bytes,
) -> None:
    source = upload_source(client, device_headers, png_bytes).json()
    repository = client.app.state.repository
    owner_id = client.app.state.authenticator._authenticate_device(
        device_headers["X-Device-ID"]
    ).owner_id

    def create_once():
        return repository.create_job(
            owner_id=owner_id,
            source_id=source["id"],
            scenario="success",
            idempotency_key="concurrent-job-key",
        )

    with ThreadPoolExecutor(max_workers=2) as executor:
        job_results = list(executor.map(lambda _: create_once(), range(2)))
    assert len({result[0]["id"] for result in job_results}) == 1
    assert sorted(result[1] for result in job_results) == [False, True]

    job = job_results[0][0]
    sticker_set = repository.get_set(
        owner_id=owner_id,
        set_id=job["sticker_set_id"],
    )
    selected = [item["id"] for item in sticker_set["stickers"][:2]]

    def save_once():
        return repository.save_set(
            owner_id=owner_id,
            set_id=sticker_set["id"],
            sticker_ids=selected,
            idempotency_key="concurrent-save-key",
        )

    with ThreadPoolExecutor(max_workers=2) as executor:
        pack_results = list(executor.map(lambda _: save_once(), range(2)))
    assert len({result[0]["id"] for result in pack_results}) == 1
    assert sorted(result[1] for result in pack_results) == [False, True]
