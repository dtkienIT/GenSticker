from datetime import datetime, timedelta, timezone
from pathlib import Path

from backend.app.db.models.asset import Asset


OPEN_SOURCE_FIXTURES = Path(__file__).parents[2] / "test_images" / "open_source"


def accept_consent(client, user_id="local-dev-user"):
    response = client.put(
        "/api/v1/consent",
        headers={"X-Dev-User-Id": user_id},
        json={
            "consent_version": "1.0",
            "accepted": True,
            "reuse_opt_in": False,
            "accepted_at": None,
        },
    )
    assert response.status_code == 200


def create_test_image_bytes():
    return (OPEN_SOURCE_FIXTURES / "public-domain-barack-obama.jpg").read_bytes()


def test_upload_selfie_success(client):
    accept_consent(client)
    img_bytes = create_test_image_bytes()
    response = client.post(
        "/api/v1/assets/selfies",
        files={"file": ("selfie.jpg", img_bytes, "image/jpeg")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["validation"]["valid"] is True
    assert data["asset"]["asset_type"] == "selfie"
    assert data["asset"]["width"] == 444
    assert data["asset"]["height"] == 600


def test_upload_photo_without_face_is_rejected(client):
    accept_consent(client)
    img_bytes = (OPEN_SOURCE_FIXTURES / "cc0-mug.jpg").read_bytes()
    response = client.post(
        "/api/v1/assets/selfies",
        files={"file": ("mug.jpg", img_bytes, "image/jpeg")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["validation"]["valid"] is False
    assert data["validation"]["reason_codes"] == ["face_count_invalid"]


def test_upload_invalid_image(client):
    accept_consent(client)
    response = client.post(
        "/api/v1/assets/selfies",
        files={"file": ("corrupt.txt", b"not an image", "text/plain")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["validation"]["valid"] is False
    assert "invalid_image" in data["validation"]["reason_codes"]


def test_tenant_asset_isolation(client):
    img_bytes = create_test_image_bytes()

    # User 1 uploads
    accept_consent(client, "user-1")
    res1 = client.post(
        "/api/v1/assets/selfies",
        files={"file": ("selfie.jpg", img_bytes, "image/jpeg")},
        headers={"X-Dev-User-Id": "user-1"},
    )
    asset_id = res1.json()["asset"]["id"]

    # User 2 attempts to fetch metadata -> 403 Forbidden
    res2 = client.get(
        f"/api/v1/assets/{asset_id}",
        headers={"X-Dev-User-Id": "user-2"},
    )
    assert res2.status_code == 403

    # User 2 attempts to fetch content -> 403 Forbidden
    res3 = client.get(
        f"/api/v1/assets/{asset_id}/content",
        headers={"X-Dev-User-Id": "user-2"},
    )
    assert res3.status_code == 403

    # User 1 fetches content -> 200 OK
    res4 = client.get(
        f"/api/v1/assets/{asset_id}/content",
        headers={"X-Dev-User-Id": "user-1"},
    )
    assert res4.status_code == 200


def test_asset_expiration_guards_metadata_and_content(client, test_db_session):
    accept_consent(client)
    uploaded = client.post(
        "/api/v1/assets/selfies",
        files={"file": ("selfie.jpg", create_test_image_bytes(), "image/jpeg")},
    )
    assert uploaded.status_code == 200
    asset_id = uploaded.json()["asset"]["id"]
    asset = test_db_session.query(Asset).filter(Asset.id == asset_id).one()

    asset.expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
    test_db_session.commit()

    active_metadata = client.get(f"/api/v1/assets/{asset_id}")
    active_content = client.get(f"/api/v1/assets/{asset_id}/content")
    assert active_metadata.status_code == 200
    assert active_content.status_code == 200

    asset.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
    test_db_session.commit()

    expired_metadata = client.get(f"/api/v1/assets/{asset_id}")
    expired_content = client.get(f"/api/v1/assets/{asset_id}/content")
    assert expired_metadata.status_code == 410
    assert expired_content.status_code == 410
    assert expired_metadata.json()["error"]["code"] == "asset_url_expired"
    assert expired_content.json()["error"]["code"] == "asset_url_expired"
