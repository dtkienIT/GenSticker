from pathlib import Path

import pytest
from backend.app.jobs.runner import process_one_job


@pytest.mark.asyncio
async def test_job_execution_vertical_slice(client, test_db_session):
    consent_res = client.put(
        "/api/v1/consent",
        json={
            "consent_version": "1.0",
            "accepted": True,
            "reuse_opt_in": False,
            "accepted_at": None,
        },
    )
    assert consent_res.status_code == 200

    selfie_bytes = (
        Path(__file__).parents[2]
        / "test_images"
        / "open_source"
        / "public-domain-barack-obama.jpg"
    ).read_bytes()
    selfie_res = client.post(
        "/api/v1/assets/selfies",
        files={"file": ("selfie.jpg", selfie_bytes, "image/jpeg")},
    )
    assert selfie_res.status_code == 200

    # 1. Create character
    char_res = client.post(
        "/api/v1/characters",
        json={
            "display_name": "Test Character",
            "selfie_asset_id": selfie_res.json()["asset"]["id"],
        },
    )
    char_id = char_res.json()["id"]

    # 2. Create job
    job_res = client.post(
        "/api/v1/generation-jobs",
        json={
            "character_id": char_id,
            "kind": "canonical_generation",
            "seed": 12345,
            "style": "chibi",
            "emotion": "happy",
        },
    )
    assert job_res.status_code == 200
    job_id = job_res.json()["id"]
    assert job_res.json()["status"] == "queued"

    # 3. Process job via worker runner
    processed = await process_one_job(test_db_session)
    assert processed is True

    # 4. Check job status
    job_get = client.get(f"/api/v1/generation-jobs/{job_id}")
    assert job_get.status_code == 200
    job_data = job_get.json()
    assert job_data["status"] == "succeeded"
    assert job_data["progress"] == 100
    assert len(job_data["result"]["candidates"]) == 3

    # 5. Check events
    events_get = client.get(f"/api/v1/generation-jobs/{job_id}/events")
    assert events_get.status_code == 200
    assert len(events_get.json()) >= 4

    # 6. Check cost ledger
    cost_get = client.get("/api/v1/cost-ledger")
    assert cost_get.status_code == 200
    assert len(cost_get.json()) == 1
    assert cost_get.json()[0]["job_id"] == job_id
