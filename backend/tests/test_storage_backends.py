from io import BytesIO
from typing import Any, List

from backend.app.api.v1.endpoints import assets as assets_endpoint
from backend.app.api.v1.endpoints import health as health_endpoint
from backend.app.storage.asset_store import LocalFilesystemAssetStore
from backend.app.storage.supabase_store import SupabaseAssetStore
from PIL import Image as PILImage
from PIL import ImageDraw


def create_png_bytes(width: int = 32, height: int = 24) -> bytes:
    buffer = BytesIO()
    image = PILImage.new("RGB", (width, height), color="purple")
    ImageDraw.Draw(image).rectangle(
        [width // 4, height // 4, width // 2, height // 2],
        fill="yellow",
    )
    image.save(buffer, format="PNG")
    return buffer.getvalue()


class FakeBucket:
    def __init__(self) -> None:
        self.objects: dict[str, bytes] = {}
        self.upload_options: dict[str, dict[str, Any]] = {}

    def upload(self, path: str, file: bytes, file_options: dict[str, Any]) -> dict[str, str]:
        self.objects[path] = file
        self.upload_options[path] = file_options
        return {"path": path}

    def download(self, path: str) -> bytes:
        return self.objects[path]

    def create_signed_url(self, path: str, expires_in: int) -> dict[str, str]:
        return {"signedURL": f"https://storage.example/{path}?expires={expires_in}"}

    def list(self, path: str, options: dict[str, Any]) -> List[dict[str, str]]:
        del path, options
        return []

    def remove(self, paths: List[str]) -> List[dict[str, str]]:
        for path in paths:
            self.objects.pop(path, None)
        return [{"name": path} for path in paths]


class FakeStorage:
    def __init__(self, bucket: FakeBucket) -> None:
        self.bucket = bucket
        self.requested_bucket: str | None = None

    def from_(self, bucket: str) -> FakeBucket:
        self.requested_bucket = bucket
        return self.bucket


class FakeSupabaseClient:
    def __init__(self, bucket: FakeBucket) -> None:
        self.storage = FakeStorage(bucket)


def test_local_store_round_trips_images_and_zip_files(temp_dir):
    store = LocalFilesystemAssetStore(root_dir=temp_dir)
    image_bytes = create_png_bytes()

    image = store.save_bytes(image_bytes, "user-1", extension=".png")
    archive = store.save_bytes(b"PK\x03\x04archive", "user-1", extension=".zip")

    assert store.read_bytes(image.relative_path) == image_bytes
    assert image.mime_type == "image/png"
    assert image.width == 32
    assert image.height == 24
    assert archive.mime_type == "application/zip"
    assert archive.width is None
    assert archive.height is None
    assert store.read_bytes(archive.relative_path) == b"PK\x03\x04archive"
    assert store.create_signed_url(image.relative_path) is None
    assert store.is_ready() is True


def test_supabase_store_round_trip_signed_url_and_readiness():
    bucket = FakeBucket()
    client = FakeSupabaseClient(bucket)
    store = SupabaseAssetStore(client=client, bucket="stickers")  # type: ignore[arg-type]
    image_bytes = create_png_bytes()

    stored = store.save_bytes(image_bytes, "user-1", extension=".png")
    archive = store.save_bytes(b"PK\x03\x04archive", "user-1", extension=".zip")

    assert stored.absolute_path is None
    assert stored.mime_type == "image/png"
    assert store.read_bytes(stored.relative_path) == image_bytes
    assert bucket.upload_options[stored.relative_path] == {"content-type": "image/png"}
    assert archive.mime_type == "application/zip"
    assert archive.width is None
    assert archive.height is None
    assert store.read_bytes(archive.relative_path) == b"PK\x03\x04archive"
    assert bucket.upload_options[archive.relative_path] == {"content-type": "application/zip"}
    assert store.create_signed_url(stored.relative_path, expires_in=60) == (
        f"https://storage.example/{stored.relative_path}?expires=60"
    )
    assert store.is_ready() is True
    assert store.delete_asset(stored.relative_path) is True
    assert stored.relative_path not in bucket.objects
    assert client.storage.requested_bucket == "stickers"


def test_cloud_asset_content_redirects_to_signed_url(client, monkeypatch):
    consent = client.put(
        "/api/v1/consent",
        json={"consent_version": "1.0", "accepted": True, "reuse_opt_in": False},
    )
    assert consent.status_code == 200

    uploaded = client.post(
        "/api/v1/assets/selfies",
        files={"file": ("selfie.png", create_png_bytes(512, 512), "image/png")},
    )
    asset_id = uploaded.json()["asset"]["id"]

    bucket = FakeBucket()
    cloud_store = SupabaseAssetStore(
        client=FakeSupabaseClient(bucket),  # type: ignore[arg-type]
        bucket="stickers",
    )
    monkeypatch.setattr(assets_endpoint, "default_asset_store", cloud_store)

    response = client.get(f"/api/v1/assets/{asset_id}/content", follow_redirects=False)

    assert response.status_code == 307
    assert response.headers["location"].startswith("https://storage.example/")


def test_readiness_uses_asset_store_contract(client, monkeypatch):
    class UnavailableStore:
        @staticmethod
        def is_ready() -> bool:
            return False

    monkeypatch.setattr(health_endpoint, "default_asset_store", UnavailableStore())

    response = client.get("/ready")

    assert response.status_code == 200
    assert response.json() == {
        "status": "not_ready",
        "database": True,
        "asset_store": False,
    }
