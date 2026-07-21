import hashlib
import json
import uuid
from datetime import datetime, timezone
from io import BytesIO
from zipfile import ZipFile

from backend.app.db.models.asset import Asset
from backend.app.db.models.character import Character
from backend.app.db.models.export import ExportManifest
from backend.app.db.models.job import GenerationJob, JobEvent
from backend.app.storage import asset_store as asset_store_module
from PIL import Image

DEFAULT_PROFILE_CONFIG = {
    "hair": {"style": "original", "color": "original"},
    "face_accessories": ["none"],
    "outfit": "casual",
    "style": "chibi",
}


def accept_consent(client, *, accepted=True):
    return client.put(
        "/api/v1/consent",
        json={
            "consent_version": "1.0",
            "accepted": accepted,
            "reuse_opt_in": True,
            "accepted_at": None,
        },
    )


def seed_canonical_asset(client, db):
    character_response = client.post(
        "/api/v1/characters", json={"display_name": "Product Character"}
    )
    assert character_response.status_code == 200
    character_id = character_response.json()["id"]
    character = db.query(Character).filter(Character.id == character_id).one()

    now = datetime.now(timezone.utc)
    asset = Asset(
        id=str(uuid.uuid4()),
        user_id=character.user_id,
        character_id=character.id,
        job_id=None,
        asset_type="canonical",
        relative_path=f"{character.user_id}/canonical/test.png",
        mime_type="image/png",
        byte_size=128,
        sha256="a" * 64,
        width=512,
        height=512,
        created_at=now,
    )
    db.add(asset)
    db.commit()
    return character, asset


def approve_profile(client, character_id, asset_id):
    response = client.post(
        f"/api/v1/characters/{character_id}/profiles/approve",
        json={"canonical_asset_id": asset_id, "config": DEFAULT_PROFILE_CONFIG},
    )
    assert response.status_code == 200
    return response.json()


def test_consent_persists_and_is_required_for_canonical_job(client):
    initial = client.get("/api/v1/consent")
    assert initial.status_code == 200
    assert initial.json() == {
        "consent_version": "1.0",
        "accepted": False,
        "reuse_opt_in": False,
        "accepted_at": None,
    }

    character = client.post("/api/v1/characters", json={"display_name": "No Consent"}).json()
    blocked = client.post(
        "/api/v1/generation-jobs",
        json={"character_id": character["id"], "kind": "canonical_generation"},
    )
    assert blocked.status_code == 403
    assert blocked.json()["error"]["code"] == "consent_required"

    updated = accept_consent(client)
    assert updated.status_code == 200
    assert updated.json()["accepted"] is True
    assert updated.json()["reuse_opt_in"] is True
    assert updated.json()["accepted_at"] is not None
    assert client.get("/api/v1/consent").json() == updated.json()

    missing_selfie = client.post(
        "/api/v1/generation-jobs",
        json={"character_id": character["id"], "kind": "canonical_generation"},
    )
    assert missing_selfie.status_code == 422
    assert missing_selfie.json()["error"]["code"] == "asset_not_found"


def test_profile_approval_and_immutable_update(client, test_db_session):
    character, asset = seed_canonical_asset(client, test_db_session)
    first = approve_profile(client, character.id, asset.id)
    assert first["version"] == 1
    assert first["canonical_asset_id"] == asset.id

    fetched = client.get(f"/api/v1/characters/{character.id}/profiles")
    assert fetched.status_code == 200
    assert fetched.json() == first

    next_config = {**DEFAULT_PROFILE_CONFIG, "outfit": "hoodie"}
    second = client.post(
        f"/api/v1/characters/{character.id}/profiles", json={"config": next_config}
    )
    assert second.status_code == 200
    assert second.json()["version"] == 2
    assert second.json()["canonical_asset_id"] == asset.id

    original = client.get(f"/api/v1/characters/{character.id}/profiles?version=1")
    assert original.status_code == 200
    assert original.json()["config"] == DEFAULT_PROFILE_CONFIG
    character_detail = client.get(f"/api/v1/characters/{character.id}").json()
    assert character_detail["status"] == "APPROVED"
    assert character_detail["approved_profile_version"] == 2


def test_pack_routes_enqueue_slots_reconcile_export_and_retry(
    client, test_db_session, isolated_external_services, monkeypatch
):
    character, canonical_asset = seed_canonical_asset(client, test_db_session)
    profile = approve_profile(client, character.id, canonical_asset.id)

    created = client.post(
        "/api/v1/sticker-packs",
        json={
            "character_id": character.id,
            "profile_version": profile["version"],
            "template_id": "core-eight-v1",
        },
    )
    assert created.status_code == 200
    pack = created.json()
    assert pack["status"] == "QUEUED"
    assert len(pack["slots"]) == 8
    assert {slot["emotion_id"] for slot in pack["slots"]} == {
        "happy",
        "laughing",
        "love",
        "angry",
        "sad",
        "surprised",
        "confused",
        "sleepy",
    }

    jobs = (
        test_db_session.query(GenerationJob)
        .filter(GenerationJob.pack_id == pack["id"])
        .order_by(GenerationJob.created_at.asc())
        .all()
    )
    assert len(jobs) == 8
    assert (
        test_db_session.query(JobEvent)
        .filter(JobEvent.job_id.in_([job.id for job in jobs]))
        .count()
        == 8
    )
    first_request = json.loads(jobs[0].request_json)
    assert first_request["source_asset_id"] == canonical_asset.id
    assert first_request["extra_params"]["slot_id"] == pack["slots"][0]["id"]

    source_output = BytesIO()
    source_color = (24, 80, 120, 255)
    Image.new("RGBA", (128, 128), source_color).save(source_output, format="PNG")
    stored_sticker = isolated_external_services.save_bytes(
        source_output.getvalue(),
        character.user_id,
        extension=".png",
        asset_subfolder="stickers",
    )
    sticker_asset = Asset(
        id=str(uuid.uuid4()),
        user_id=character.user_id,
        character_id=character.id,
        job_id=jobs[0].id,
        asset_type="sticker",
        relative_path=stored_sticker.relative_path,
        mime_type=stored_sticker.mime_type,
        byte_size=stored_sticker.byte_size,
        sha256=stored_sticker.sha256,
        width=stored_sticker.width,
        height=stored_sticker.height,
        created_at=datetime.now(timezone.utc),
    )
    test_db_session.add(sticker_asset)
    jobs[0].status = "succeeded"
    jobs[0].current_stage = "completed"
    jobs[0].progress = 100
    jobs[0].result_json = json.dumps(
        {"candidates": [{"asset_id": sticker_asset.id}], "asset_ids": [sticker_asset.id]}
    )
    test_db_session.commit()

    detail = client.get(f"/api/v1/sticker-packs/{pack['id']}")
    assert detail.status_code == 200
    completed_slot = detail.json()["slots"][0]
    assert completed_slot["status"] == "completed"
    assert completed_slot["selected_asset_id"] == sticker_asset.id

    text_update = client.put(
        f"/api/v1/sticker-packs/{pack['id']}/slots/{completed_slot['id']}/text",
        json={"text": "Xin chao", "placement": "bottom", "font_size": 28},
    )
    assert text_update.status_code == 200
    assert text_update.json()["text"]["text"] == "Xin chao"

    class FailOnSecondSaveStore:
        def __init__(self, delegate):
            self.delegate = delegate
            self.save_attempts = 0
            self.saved_paths = []
            self.deleted_paths = []

        def read_bytes(self, relative_path):
            return self.delegate.read_bytes(relative_path)

        def save_bytes(self, data, user_id, extension=".png", asset_subfolder="selfies"):
            self.save_attempts += 1
            if self.save_attempts == 2:
                raise RuntimeError("simulated second export write failure")
            stored = self.delegate.save_bytes(data, user_id, extension, asset_subfolder)
            self.saved_paths.append(stored.relative_path)
            return stored

        def delete_asset(self, relative_path):
            self.deleted_paths.append(relative_path)
            return self.delegate.delete_asset(relative_path)

    failing_store = FailOnSecondSaveStore(isolated_external_services)
    monkeypatch.setattr(asset_store_module, "default_asset_store", failing_store)
    failed_export = client.post(
        f"/api/v1/sticker-packs/{pack['id']}/exports", json={"formats": ["png", "webp"]}
    )
    assert failed_export.status_code == 500
    assert failed_export.json()["error"]["code"] == "export_failed"
    assert failing_store.deleted_paths == failing_store.saved_paths
    assert all(
        not isolated_external_services.get_absolute_path(path).exists()
        for path in failing_store.saved_paths
    )
    assert test_db_session.query(Asset).filter(Asset.asset_type == "export").count() == 0
    monkeypatch.setattr(asset_store_module, "default_asset_store", isolated_external_services)

    exported = client.post(
        f"/api/v1/sticker-packs/{pack['id']}/exports",
        json={"formats": ["png", "webp", "zip"]},
    )
    assert exported.status_code == 200
    manifest = exported.json()
    assert manifest["formats"] == ["png", "webp", "zip"]
    assert len(manifest["assets"]) == 3
    assert [asset["format"] for asset in manifest["assets"]] == ["png", "webp", "zip"]
    assert set(manifest["checksums"]) == {
        asset["asset_id"] for asset in manifest["assets"]
    }
    assert sticker_asset.id not in {asset["asset_id"] for asset in manifest["assets"]}

    export_rows = (
        test_db_session.query(Asset)
        .filter(Asset.id.in_([asset["asset_id"] for asset in manifest["assets"]]))
        .all()
    )
    export_rows_by_id = {asset.id: asset for asset in export_rows}
    assert len(export_rows_by_id) == 3
    assert {asset.asset_type for asset in export_rows} == {"export"}
    for manifest_asset in manifest["assets"]:
        export_row = export_rows_by_id[manifest_asset["asset_id"]]
        artifact_bytes = isolated_external_services.read_bytes(export_row.relative_path)
        expected_checksum = hashlib.sha256(artifact_bytes).hexdigest()
        assert manifest["checksums"][export_row.id] == expected_checksum
        assert export_row.sha256 == expected_checksum
        assert manifest_asset["content_uri"] == f"/api/v1/assets/{export_row.id}/content"
        content_response = client.get(manifest_asset["content_uri"])
        assert content_response.status_code == 200
        assert content_response.content == artifact_bytes

        if manifest_asset["format"] in {"png", "webp"}:
            with Image.open(BytesIO(artifact_bytes)) as rendered_image:
                assert rendered_image.size == (128, 128)
                assert rendered_image.format == manifest_asset["format"].upper()
                assert set(rendered_image.convert("RGBA").getdata()) != {source_color}
        else:
            with ZipFile(BytesIO(artifact_bytes)) as archive:
                assert archive.namelist() == ["happy.png"]
                with Image.open(BytesIO(archive.read("happy.png"))) as zipped_image:
                    assert zipped_image.format == "PNG"
                    assert zipped_image.size == (128, 128)

    assert client.get(f"/api/v1/exports/{manifest['id']}").json() == manifest

    export_manifest = (
        test_db_session.query(ExportManifest)
        .filter(ExportManifest.id == manifest["id"])
        .one()
    )
    export_manifest.expires_at = datetime(2020, 1, 1, tzinfo=timezone.utc)
    test_db_session.commit()
    expired = client.get(f"/api/v1/exports/{manifest['id']}")
    assert expired.status_code == 410
    assert expired.json()["error"]["code"] == "asset_url_expired"

    retried = client.post(
        f"/api/v1/sticker-packs/{pack['id']}/slots/{completed_slot['id']}/regenerate"
    )
    assert retried.status_code == 200
    assert retried.json()["status"] == "queued"
    assert retried.json()["retry_count"] == 1
    assert retried.json()["previous_image_uri"].endswith(f"/{sticker_asset.id}/content")
    assert (
        test_db_session.query(GenerationJob).filter(GenerationJob.pack_id == pack["id"]).count()
        == 9
    )

    listed = client.get(f"/api/v1/sticker-packs?character_id={character.id}")
    assert listed.status_code == 200
    assert [item["id"] for item in listed.json()] == [pack["id"]]
