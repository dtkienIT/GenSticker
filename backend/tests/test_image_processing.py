from __future__ import annotations

from io import BytesIO

from PIL import Image, ImageDraw

from app.image_processing import assess_sticker_png, split_four_by_two_sheet


def _sheet() -> bytes:
    image = Image.new("RGB", (800, 400), "white")
    draw = ImageDraw.Draw(image)
    for ordinal in range(8):
        col, row = ordinal % 4, ordinal // 4
        left, top = col * 200 + 30, row * 200 + 30
        draw.ellipse((left, top, left + 140, top + 140), fill=(20 * ordinal, 60, 180))
    output = BytesIO()
    image.save(output, "PNG")
    return output.getvalue()


def test_fixed_sheet_split_returns_eight_rgba_png_cells() -> None:
    cells = split_four_by_two_sheet(_sheet())
    assert len(cells) == 8
    for cell in cells:
        with Image.open(BytesIO(cell)) as image:
            assert image.size == (512, 512)
            assert image.mode == "RGBA"


def test_quality_gate_accepts_margin_and_rejects_edge_touch() -> None:
    image = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    ImageDraw.Draw(image).ellipse((80, 80, 432, 432), fill=(20, 60, 180, 255))
    output = BytesIO()
    image.save(output, "PNG")
    assert assess_sticker_png(output.getvalue()).passed is True

    ImageDraw.Draw(image).rectangle((0, 100, 120, 300), fill=(20, 60, 180, 255))
    output = BytesIO()
    image.save(output, "PNG")
    result = assess_sticker_png(output.getvalue())
    assert result.passed is False
    assert "EDGE_TOUCH" in result.reason_codes
