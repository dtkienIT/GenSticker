from __future__ import annotations

import hashlib
from collections import deque
from io import BytesIO
from pathlib import Path
from typing import Any, Iterable, cast

from PIL import Image, ImageFilter


def postprocess_sticker(
    image_bytes: bytes,
    *,
    canvas_size: int = 640,
    padding_px: int = 24,
    outline_px: int = 8,
    background_tolerance: int = 24,
) -> bytes:
    """Remove a flat border-connected background and create a clean sticker PNG."""
    source = Image.open(BytesIO(image_bytes)).convert("RGBA")
    source = _remove_border_background(source, background_tolerance)
    bbox = source.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError("sticker_has_no_foreground")
    foreground = source.crop(bbox)

    max_side = max(1, canvas_size - (padding_px * 2) - (outline_px * 2))
    scale = min(max_side / foreground.width, max_side / foreground.height)
    resized = foreground.resize(
        (max(1, round(foreground.width * scale)), max(1, round(foreground.height * scale))),
        Image.Resampling.LANCZOS,
    )
    alpha = resized.getchannel("A")
    kernel = min(31, max(3, outline_px * 2 + 1))
    if kernel % 2 == 0:
        kernel -= 1
    outline_alpha = alpha.filter(ImageFilter.MaxFilter(kernel))
    outline = Image.new("RGBA", resized.size, (255, 255, 255, 0))
    outline.putalpha(outline_alpha)
    layered = Image.alpha_composite(outline, resized)

    result = Image.new("RGBA", (canvas_size, canvas_size), (255, 255, 255, 0))
    offset = ((canvas_size - layered.width) // 2, (canvas_size - layered.height) // 2)
    result.alpha_composite(layered, offset)
    buffer = BytesIO()
    result.save(buffer, format="PNG", optimize=True)
    return buffer.getvalue()


def build_contact_sheet(
    sticker_paths: Iterable[Path],
    output_path: Path,
    *,
    columns: int = 5,
    cell_size: int = 640,
) -> Path:
    paths = tuple(sticker_paths)
    if not paths:
        raise ValueError("contact_sheet_requires_stickers")
    rows = (len(paths) + columns - 1) // columns
    sheet = Image.new("RGBA", (columns * cell_size, rows * cell_size), "white")
    for index, path in enumerate(paths):
        image = Image.open(path).convert("RGBA")
        if image.size != (cell_size, cell_size):
            image = image.resize((cell_size, cell_size), Image.Resampling.LANCZOS)
        sheet.alpha_composite(image, ((index % columns) * cell_size, (index // columns) * cell_size))
    output_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.convert("RGB").save(output_path, format="PNG", optimize=True)
    return output_path


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _remove_border_background(image: Image.Image, tolerance: int) -> Image.Image:
    pixels = cast(Any, image.load())
    width, height = image.size
    samples = [pixels[0, 0][:3], pixels[width - 1, 0][:3], pixels[0, height - 1][:3], pixels[width - 1, height - 1][:3]]
    background = tuple(round(sum(sample[channel] for sample in samples) / len(samples)) for channel in range(3))

    def close_to_background(x: int, y: int) -> bool:
        pixel = pixels[x, y]
        return max(abs(pixel[channel] - background[channel]) for channel in range(3)) <= tolerance

    queue: deque[tuple[int, int]] = deque()
    visited: set[tuple[int, int]] = set()
    for x in range(width):
        queue.extend(((x, 0), (x, height - 1)))
    for y in range(height):
        queue.extend(((0, y), (width - 1, y)))
    while queue:
        point = queue.popleft()
        if point in visited or not (0 <= point[0] < width and 0 <= point[1] < height):
            continue
        visited.add(point)
        if not close_to_background(*point):
            continue
        x, y = point
        pixels[x, y] = (*pixels[x, y][:3], 0)
        queue.extend(((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)))
    return image
