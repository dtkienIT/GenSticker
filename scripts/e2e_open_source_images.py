"""Exercise real-photo validation and CUT generation against a running local API."""

import asyncio
from pathlib import Path

from backend.app.db.base import Base
from backend.app.db.session import SessionLocal, engine
from backend.app.jobs.runner import process_one_job
from backend.app.main import app
from fastapi.testclient import TestClient


ROOT = Path(__file__).parents[1]
FIXTURES = ROOT / "test_images" / "open_source"
RESULTS = ROOT / "test_results"
HEADERS = {"X-Dev-User-Id": "local-dev-user"}


def upload(client: TestClient, path: Path) -> dict:
    with path.open("rb") as image:
        response = client.post(
            "/api/v1/assets/selfies",
            files={"file": (path.name, image, "image/jpeg")},
        )
    assert response.status_code == 200, response.text
    return response.json()


def main() -> None:
    RESULTS.mkdir(exist_ok=True)
    Base.metadata.create_all(bind=engine)
    with TestClient(app, headers=HEADERS) as client:
        consent = client.put(
            "/api/v1/consent",
            json={
                "consent_version": "1.0",
                "accepted": True,
                "reuse_opt_in": False,
                "accepted_at": None,
            },
        )
        consent.raise_for_status()

        mug = upload(client, FIXTURES / "cc0-mug.jpg")
        assert mug["asset"] is None, mug
        assert mug["validation"]["reason_codes"] == ["face_count_invalid"], mug

        portrait = upload(client, FIXTURES / "public-domain-barack-obama.jpg")
        assert portrait["validation"]["valid"] is True
        selfie_asset_id = portrait["asset"]["id"]

        character = client.post(
            "/api/v1/characters",
            json={
                "display_name": "Open-source E2E portrait",
                "selfie_asset_id": selfie_asset_id,
            },
        )
        character.raise_for_status()

        job = client.post(
            "/api/v1/generation-jobs",
            json={
                "character_id": character.json()["id"],
                "kind": "canonical_generation",
                "seed": 20260723,
                "style": "chibi",
                "emotion": "happy",
            },
        )
        job.raise_for_status()
        job_id = job.json()["id"]

        with SessionLocal() as db:
            processed = asyncio.run(process_one_job(db))
        assert processed is True

        completed = client.get(f"/api/v1/generation-jobs/{job_id}")
        completed.raise_for_status()
        completed_payload = completed.json()
        assert completed_payload["status"] == "succeeded", completed_payload
        candidate = completed_payload["result"]["candidates"][0]

        result = client.get(f"/api/v1/assets/{candidate['asset_id']}/content")
        result.raise_for_status()
        output = RESULTS / "public-domain-portrait-sticker.png"
        output.write_bytes(result.content)

        print(
            {
                "mug_validation": mug["validation"],
                "portrait_validation": portrait["validation"],
                "job_id": job_id,
                "job_status": completed_payload["status"],
                "provider": completed_payload["provider"],
                "result": str(output),
            }
        )


if __name__ == "__main__":
    main()
