from io import BytesIO

from PIL import Image as PILImage
from PIL import ImageDraw


def create_test_image_bytes(width=512, height=512, color="blue"):
    img = PILImage.new("RGB", (width, height), color=color)
    draw = ImageDraw.Draw(img)
    draw.rectangle([50, 50, 200, 200], fill="yellow")
    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_upload_selfie_success(client):
    img_bytes = create_test_image_bytes()
    response = client.post(
        "/api/v1/assets/selfies",
        files={"file": ("selfie.png", img_bytes, "image/png")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["validation"]["valid"] is True
    assert data["asset"]["asset_type"] == "selfie"
    assert data["asset"]["width"] == 512
    assert data["asset"]["height"] == 512


def test_upload_invalid_image(client):
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
    res1 = client.post(
        "/api/v1/assets/selfies",
        files={"file": ("selfie.png", img_bytes, "image/png")},
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
