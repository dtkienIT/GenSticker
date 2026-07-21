import hashlib
import uuid
from pathlib import Path
from typing import Any, Optional

from supabase import Client, create_client

from backend.app.core.config import settings
from backend.app.core.errors import GenStickerException
from backend.app.storage.asset_store import AssetStore, StoredAssetMetadata, inspect_asset_bytes


class SupabaseAssetStore(AssetStore):
    def __init__(
        self,
        client: Optional[Client] = None,
        bucket: Optional[str] = None,
        url: Optional[str] = None,
        service_role_key: Optional[str] = None,
    ):
        configured_url = url if url is not None else settings.SUPABASE_URL
        configured_key = (
            service_role_key if service_role_key is not None else settings.SUPABASE_SERVICE_ROLE_KEY
        )
        if client is None and (not configured_url or not configured_key):
            raise GenStickerException(
                code="supabase_not_configured",
                message="Supabase URL or Service Role Key is missing.",
                status_code=500,
            )
        self.client = (
            client if client is not None else create_client(configured_url, configured_key)
        )
        self.bucket = bucket or settings.SUPABASE_STORAGE_BUCKET

    def _bucket_client(self) -> Any:
        return self.client.storage.from_(self.bucket)

    def save_bytes(
        self,
        data: bytes,
        user_id: str,
        extension: str = ".png",
        asset_subfolder: str = "selfies",
    ) -> StoredAssetMetadata:
        if len(data) > settings.MAX_UPLOAD_BYTES:
            raise GenStickerException(
                code="file_too_large",
                message=f"File size exceeds limit of {settings.MAX_UPLOAD_BYTES} bytes.",
                status_code=400,
            )

        sha256_hash = hashlib.sha256(data).hexdigest()
        width, height, mime_type = inspect_asset_bytes(data, extension)

        # Generate unique filename
        filename = f"{uuid.uuid4().hex}{extension.lower()}"
        rel_path = f"{user_id}/{asset_subfolder}/{filename}"

        try:
            self._bucket_client().upload(
                path=rel_path,
                file=data,
                file_options={"content-type": mime_type},
            )
        except Exception as exc:
            raise GenStickerException(
                code="storage_write_failed",
                message="Asset content could not be written to cloud storage.",
                status_code=500,
            ) from exc

        return StoredAssetMetadata(
            relative_path=rel_path,
            absolute_path=None,
            mime_type=mime_type,
            byte_size=len(data),
            sha256=sha256_hash,
            width=width,
            height=height,
        )

    def get_absolute_path(self, relative_path: str) -> Path:
        del relative_path
        raise GenStickerException(
            code="storage_read_failed",
            message="Cloud assets do not have a local filesystem path.",
            status_code=500,
        )

    def read_bytes(self, relative_path: str) -> bytes:
        try:
            content = self._bucket_client().download(relative_path)
            if not isinstance(content, bytes):
                raise TypeError("Cloud storage returned non-bytes content")
            return content
        except Exception as exc:
            raise GenStickerException(
                code="storage_read_failed",
                message="Asset content could not be read from cloud storage.",
                status_code=500,
            ) from exc

    def create_signed_url(self, relative_path: str, expires_in: int = 300) -> Optional[str]:
        try:
            response = self._bucket_client().create_signed_url(relative_path, expires_in)
            signed_url: Any
            if isinstance(response, str):
                signed_url = response
            elif isinstance(response, dict):
                signed_url = (
                    response.get("signedURL")
                    or response.get("signedUrl")
                    or response.get("signed_url")
                )
            else:
                signed_url = getattr(response, "signedURL", None) or getattr(
                    response, "signed_url", None
                )
            if not isinstance(signed_url, str) or not signed_url:
                raise ValueError("Cloud storage did not return a signed URL")
            return signed_url
        except Exception as exc:
            raise GenStickerException(
                code="storage_read_failed",
                message="A temporary asset URL could not be created.",
                status_code=500,
            ) from exc

    def is_ready(self) -> bool:
        try:
            return self._bucket_client().list(path="", options={"limit": 1}) is not None
        except Exception:
            return False

    def delete_asset(self, relative_path: str) -> bool:
        try:
            self._bucket_client().remove([relative_path])
            return True
        except Exception:
            return False
