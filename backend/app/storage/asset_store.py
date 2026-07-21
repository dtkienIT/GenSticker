import hashlib
import uuid
from abc import ABC, abstractmethod
from io import BytesIO
from pathlib import Path
from typing import Optional, Tuple

from PIL import Image as PILImage

from backend.app.core.config import settings
from backend.app.core.errors import GenStickerException

_NON_IMAGE_MIME_TYPES = {
    ".zip": "application/zip",
}


def inspect_asset_bytes(
    data: bytes,
    extension: str,
) -> Tuple[Optional[int], Optional[int], str]:
    """Return dimensions and MIME type without trying to decode known archives as images."""
    normalized_extension = extension.lower()
    non_image_mime_type = _NON_IMAGE_MIME_TYPES.get(normalized_extension)
    if non_image_mime_type:
        return None, None, non_image_mime_type

    try:
        with PILImage.open(BytesIO(data)) as image:
            image.verify()
        with PILImage.open(BytesIO(data)) as image:
            width, height = image.size
            image_format = (image.format or "").lower()
            mime_type = PILImage.MIME.get(image.format or "") or (
                f"image/{image_format}"
                if image_format
                else f"image/{normalized_extension.lstrip('.')}"
            )
            return width, height, mime_type
    except Exception as exc:
        raise GenStickerException(
            code="invalid_image",
            message="File content could not be decoded as a valid image.",
            status_code=400,
        ) from exc


class StoredAssetMetadata:
    def __init__(
        self,
        relative_path: str,
        absolute_path: Optional[Path],
        mime_type: str,
        byte_size: int,
        sha256: str,
        width: Optional[int] = None,
        height: Optional[int] = None,
    ):
        self.relative_path = relative_path
        self.absolute_path = absolute_path
        self.mime_type = mime_type
        self.byte_size = byte_size
        self.sha256 = sha256
        self.width = width
        self.height = height


class AssetStore(ABC):
    @abstractmethod
    def save_bytes(
        self,
        data: bytes,
        user_id: str,
        extension: str = ".png",
        asset_subfolder: str = "selfies",
    ) -> StoredAssetMetadata:
        pass

    @abstractmethod
    def get_absolute_path(self, relative_path: str) -> Path:
        pass

    @abstractmethod
    def read_bytes(self, relative_path: str) -> bytes:
        pass

    @abstractmethod
    def create_signed_url(self, relative_path: str, expires_in: int = 300) -> Optional[str]:
        pass

    @abstractmethod
    def is_ready(self) -> bool:
        pass

    @abstractmethod
    def delete_asset(self, relative_path: str) -> bool:
        pass


class LocalFilesystemAssetStore(AssetStore):
    def __init__(self, root_dir: Optional[Path | str] = None):
        self.root_dir = Path(root_dir or settings.asset_root_path).resolve()
        self.root_dir.mkdir(parents=True, exist_ok=True)

    def _resolve_safe_path(self, relative_path: str) -> Path:
        # Prevent path traversal
        clean_rel = Path(relative_path.lstrip("/\\"))
        target = (self.root_dir / clean_rel).resolve()
        if not str(target).startswith(str(self.root_dir)):
            raise GenStickerException(
                code="path_traversal_denied",
                message="Access outside asset store root is denied.",
                status_code=400,
            )
        return target

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

        # Calculate SHA256
        sha256_hash = hashlib.sha256(data).hexdigest()

        width, height, mime_type = inspect_asset_bytes(data, extension)

        # Generate safe unique filename
        filename = f"{uuid.uuid4().hex}{extension.lower()}"
        rel_path_str = f"{user_id}/{asset_subfolder}/{filename}"
        abs_path = self._resolve_safe_path(rel_path_str)
        abs_path.parent.mkdir(parents=True, exist_ok=True)

        # Write file atomically
        temp_path = abs_path.with_suffix(".tmp")
        with open(temp_path, "wb") as f:
            f.write(data)
        temp_path.replace(abs_path)

        return StoredAssetMetadata(
            relative_path=rel_path_str,
            absolute_path=abs_path,
            mime_type=mime_type,
            byte_size=len(data),
            sha256=sha256_hash,
            width=width,
            height=height,
        )

    def get_absolute_path(self, relative_path: str) -> Path:
        return self._resolve_safe_path(relative_path)

    def read_bytes(self, relative_path: str) -> bytes:
        try:
            return self._resolve_safe_path(relative_path).read_bytes()
        except Exception as exc:
            raise GenStickerException(
                code="storage_read_failed",
                message="Asset content could not be read.",
                status_code=500,
            ) from exc

    def create_signed_url(self, relative_path: str, expires_in: int = 300) -> Optional[str]:
        del relative_path, expires_in
        return None

    def is_ready(self) -> bool:
        return self.root_dir.exists() and self.root_dir.is_dir()

    def delete_asset(self, relative_path: str) -> bool:
        try:
            target = self._resolve_safe_path(relative_path)
            if target.exists() and target.is_file():
                target.unlink()
                return True
        except Exception:
            pass
        return False


def get_default_asset_store() -> AssetStore:
    if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY:
        from backend.app.storage.supabase_store import SupabaseAssetStore

        return SupabaseAssetStore()
    return LocalFilesystemAssetStore()


default_asset_store = get_default_asset_store()
