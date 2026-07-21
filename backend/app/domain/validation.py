from abc import ABC, abstractmethod
from io import BytesIO
from typing import List, Optional

from PIL import Image as PILImage
from PIL import ImageStat
from pydantic import BaseModel

from backend.app.core.config import settings


class ValidationResult(BaseModel):
    valid: bool
    reason_codes: List[str]
    warnings: List[str]
    width: Optional[int] = None
    height: Optional[int] = None
    mime_type: Optional[str] = None
    byte_size: int = 0


class SelfieValidator(ABC):
    @abstractmethod
    def validate(self, image_bytes: bytes, mime_type: Optional[str] = None) -> ValidationResult:
        pass


class LocalSelfieValidator(SelfieValidator):
    SUPPORTED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}

    def validate(self, image_bytes: bytes, mime_type: Optional[str] = None) -> ValidationResult:
        reason_codes: List[str] = []
        warnings: List[str] = []
        byte_size = len(image_bytes)

        if byte_size == 0:
            return ValidationResult(
                valid=False,
                reason_codes=["invalid_image"],
                warnings=["Uploaded file is empty."],
                byte_size=0,
            )

        if byte_size > settings.MAX_UPLOAD_BYTES:
            reason_codes.append("file_too_large")

        try:
            with PILImage.open(BytesIO(image_bytes)) as img:
                img.verify()
            with PILImage.open(BytesIO(image_bytes)) as img:
                width, height = img.size
                fmt = (img.format or "").lower()
                detected_mime = f"image/{fmt}" if fmt else (mime_type or "image/png")
        except Exception:
            return ValidationResult(
                valid=False,
                reason_codes=["invalid_image"],
                warnings=["Failed to decode image format."],
                byte_size=byte_size,
            )

        if detected_mime not in self.SUPPORTED_MIME_TYPES:
            reason_codes.append("unsupported_type")

        if width <= 0 or height <= 0:
            reason_codes.append("invalid_image")

        if width < settings.MIN_IMAGE_WIDTH or height < settings.MIN_IMAGE_HEIGHT:
            reason_codes.append("resolution_too_low")

        if width > settings.MAX_IMAGE_WIDTH or height > settings.MAX_IMAGE_HEIGHT:
            reason_codes.append("resolution_too_high")

        if width > 0 and height > 0:
            aspect_ratio = width / float(height)
            if aspect_ratio < 0.3 or aspect_ratio > 3.0:
                reason_codes.append("invalid_aspect_ratio")

        # Blank image check via pixel variance
        try:
            with PILImage.open(BytesIO(image_bytes)) as img:
                gray = img.convert("L")
                stat = ImageStat.Stat(gray)
                if stat.var and len(stat.var) > 0 and stat.var[0] < 5.0:
                    reason_codes.append("blank_image")
        except Exception:
            pass

        valid = len(reason_codes) == 0

        return ValidationResult(
            valid=valid,
            reason_codes=reason_codes,
            warnings=warnings,
            width=width,
            height=height,
            mime_type=detected_mime,
            byte_size=byte_size,
        )


default_selfie_validator = LocalSelfieValidator()
