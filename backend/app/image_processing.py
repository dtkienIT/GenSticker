from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO

from PIL import Image

CANVAS_SIZE = 512
MIN_MARGIN = 24
MAX_STICKER_BYTES = 1024 * 1024


def _pixel_values(image: Image.Image):
    flattened = getattr(image, "get_flattened_data", None)
    return flattened() if flattened else image.getdata()


@dataclass(frozen=True, slots=True)
class StickerQualityResult:
    passed: bool
    reason_codes: tuple[str, ...]
    foreground_ratio: float


def _encode_png(image: Image.Image) -> bytes:
    output = BytesIO()
    image.save(output, "PNG", optimize=True)
    return output.getvalue()


def _remove_near_white_background(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = list(_pixel_values(rgba))
    cleaned = [
        (red, green, blue, 0) if red >= 248 and green >= 248 and blue >= 248 else pixel
        for pixel in pixels
        for red, green, blue, _alpha in (pixel,)
    ]
    result = Image.new("RGBA", rgba.size)
    result.putdata(cleaned)
    return result


def split_four_by_two_sheet(image_bytes: bytes) -> tuple[bytes, ...]:
    with Image.open(BytesIO(image_bytes)) as source:
        source.load()
        if source.width < 8 or source.height < 4:
            raise ValueError("SHEET_TOO_SMALL")
        cell_width = source.width // 4
        cell_height = source.height // 2
        cells: list[bytes] = []
        for ordinal in range(8):
            col, row = ordinal % 4, ordinal // 4
            crop = source.crop(
                (
                    col * cell_width,
                    row * cell_height,
                    (col + 1) * cell_width,
                    (row + 1) * cell_height,
                )
            )
            rgba = _remove_near_white_background(crop)
            rgba.thumbnail(
                (CANVAS_SIZE - 2 * MIN_MARGIN, CANVAS_SIZE - 2 * MIN_MARGIN),
                Image.Resampling.LANCZOS,
            )
            canvas = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
            canvas.alpha_composite(
                rgba, ((CANVAS_SIZE - rgba.width) // 2, (CANVAS_SIZE - rgba.height) // 2)
            )
            cells.append(_encode_png(canvas))
        return tuple(cells)


def assess_sticker_png(image_bytes: bytes) -> StickerQualityResult:
    reasons: list[str] = []
    if len(image_bytes) > MAX_STICKER_BYTES:
        reasons.append("FILE_TOO_LARGE")
    try:
        with Image.open(BytesIO(image_bytes)) as image:
            image.load()
            if image.format != "PNG" or image.size != (CANVAS_SIZE, CANVAS_SIZE):
                reasons.append("INVALID_FORMAT_OR_SIZE")
            rgba = image.convert("RGBA")
            alpha = rgba.getchannel("A")
            bbox = alpha.getbbox()
            if bbox is None:
                reasons.append("EMPTY_FOREGROUND")
                ratio = 0.0
            else:
                left, top, right, bottom = bbox
                if min(left, top, CANVAS_SIZE - right, CANVAS_SIZE - bottom) < MIN_MARGIN:
                    reasons.append("EDGE_TOUCH")
                foreground = sum(1 for value in _pixel_values(alpha) if value > 16)
                ratio = foreground / (CANVAS_SIZE * CANVAS_SIZE)
                if not 0.10 <= ratio <= 0.85:
                    reasons.append("FOREGROUND_RATIO")
    except Exception:
        reasons.append("DECODE_FAILED")
        ratio = 0.0
    return StickerQualityResult(not reasons, tuple(reasons), ratio)
