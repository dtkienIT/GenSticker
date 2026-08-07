from __future__ import annotations

from pathlib import Path
import hashlib
import json

from PIL import Image

from sticker_generation.catalog import DEFAULT_STICKER_CATALOG


def extract_pose_references(
    sheet_path: Path,
    output_dir: Path,
    *,
    output_size: int = 512,
    columns: int = 5,
    rows: int = 4,
) -> tuple[Path, ...]:
    """Crop the 5x4 supplied reference sheet without the caption row."""
    source = Image.open(sheet_path).convert("RGB")
    if len(DEFAULT_STICKER_CATALOG) != columns * rows:
        raise ValueError("catalog_grid_mismatch")
    output_dir.mkdir(parents=True, exist_ok=True)
    cell_width = source.width / columns
    cell_height = source.height / rows
    paths: list[Path] = []
    for index, template in enumerate(DEFAULT_STICKER_CATALOG):
        row, column = divmod(index, columns)
        horizontal_inset = cell_width * 0.025
        left = round(column * cell_width + horizontal_inset)
        right = round((column + 1) * cell_width - horizontal_inset)
        top = round(row * cell_height + cell_height * 0.27)
        bottom = round((row + 1) * cell_height)
        crop = source.crop((left, top, right, bottom))
        crop.thumbnail((output_size - 32, output_size - 32), Image.Resampling.LANCZOS)
        canvas = Image.new("RGB", (output_size, output_size), "white")
        canvas.paste(crop, ((output_size - crop.width) // 2, (output_size - crop.height) // 2))
        path = output_dir / template.reference_filename
        canvas.save(path, format="PNG", optimize=True)
        paths.append(path)
    manifest = {
        "schema_version": "pose-reference-set-v1",
        "source_sha256": hashlib.sha256(sheet_path.read_bytes()).hexdigest(),
        "items": [
            {
                "template_id": template.template_id,
                "label": template.label,
                "filename": template.reference_filename,
                "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            }
            for template, path in zip(DEFAULT_STICKER_CATALOG, paths, strict=True)
        ],
    }
    (output_dir / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    return tuple(paths)
