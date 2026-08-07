from io import BytesIO
from typing import cast

from PIL import Image, ImageDraw

from sticker_generation.postprocess import postprocess_sticker


def _source_image() -> bytes:
    image = Image.new("RGB", (96, 96), "white")
    draw = ImageDraw.Draw(image)
    draw.ellipse((24, 16, 72, 76), fill=(40, 80, 120))
    draw.ellipse((41, 36, 47, 42), fill="white")
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def test_postprocess_removes_only_border_connected_background_and_adds_outline() -> None:
    result = postprocess_sticker(
        _source_image(),
        canvas_size=128,
        background_tolerance=12,
        outline_px=5,
        padding_px=10,
    )
    image = Image.open(BytesIO(result)).convert("RGBA")

    assert image.size == (128, 128)
    corner = cast(tuple[int, int, int, int], image.getpixel((0, 0)))
    assert corner[3] == 0
    pixels = cast(list[tuple[int, int, int, int]], list(image.get_flattened_data()))
    assert max(pixel[3] for pixel in pixels) == 255
    assert any(pixel[:3] == (255, 255, 255) and pixel[3] > 0 for pixel in pixels)


def test_postprocess_output_is_deterministic() -> None:
    first = postprocess_sticker(_source_image(), canvas_size=128)
    second = postprocess_sticker(_source_image(), canvas_size=128)
    assert first == second
