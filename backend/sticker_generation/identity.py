from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageOps


def sanitize_reference_image(
    source_path: Path,
    destination_path: Path,
    *,
    max_side: int = 1536,
    preserve_alpha: bool = False,
) -> Path:
    """Normalize orientation, remove metadata, and bound API upload dimensions."""
    source_path = Path(source_path)
    if not source_path.is_file():
        raise FileNotFoundError(f"reference_image_missing:{source_path}")
    with Image.open(source_path) as opened:
        image = ImageOps.exif_transpose(opened)
        image = image.convert("RGBA" if preserve_alpha else "RGB")
        if max(image.size) > max_side:
            image.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
        destination_path.parent.mkdir(parents=True, exist_ok=True)
        image.save(destination_path, format="PNG", optimize=True)
    return destination_path
