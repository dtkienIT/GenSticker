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


def _source_with_edge_fragments() -> bytes:
    image = Image.new("RGB", (120, 100), "white")
    draw = ImageDraw.Draw(image)
    draw.ellipse((32, 16, 88, 84), fill=(40, 80, 120))
    draw.rectangle((0, 35, 13, 65), fill=(220, 30, 40))
    draw.rectangle((52, 0, 68, 9), fill=(30, 190, 70))
    draw.ellipse((96, 18, 104, 26), fill=(240, 180, 30))
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def _source_with_main_subject_touching_edge() -> bytes:
    image = Image.new("RGB", (120, 100), "white")
    draw = ImageDraw.Draw(image)
    draw.ellipse((24, 12, 96, 108), fill=(40, 80, 120))
    draw.rectangle((0, 38, 9, 62), fill=(220, 30, 40))
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


def test_postprocess_removes_cut_off_neighbor_fragments_at_cell_edges() -> None:
    result = postprocess_sticker(
        _source_with_edge_fragments(),
        canvas_size=160,
        background_tolerance=12,
        outline_px=5,
        padding_px=10,
    )
    image = Image.open(BytesIO(result)).convert("RGBA")
    opaque_colors = [
        pixel[:3]
        for pixel in cast(
            list[tuple[int, int, int, int]],
            list(image.get_flattened_data()),
        )
        if pixel[3] > 0
    ]

    assert not any(red > 180 and green < 80 for red, green, _ in opaque_colors)
    assert not any(green > 140 and red < 80 for red, green, _ in opaque_colors)


def test_postprocess_keeps_detached_decoration_inside_its_own_cell() -> None:
    result = postprocess_sticker(
        _source_with_edge_fragments(),
        canvas_size=160,
        background_tolerance=12,
        outline_px=5,
        padding_px=10,
    )
    image = Image.open(BytesIO(result)).convert("RGBA")
    opaque_colors = [
        pixel[:3]
        for pixel in cast(
            list[tuple[int, int, int, int]],
            list(image.get_flattened_data()),
        )
        if pixel[3] > 0
    ]

    assert any(red > 180 and green > 120 and blue < 100 for red, green, blue in opaque_colors)


def test_postprocess_keeps_dominant_subject_when_it_touches_cell_edge() -> None:
    result = postprocess_sticker(
        _source_with_main_subject_touching_edge(),
        canvas_size=160,
        background_tolerance=12,
        outline_px=5,
        padding_px=10,
    )
    image = Image.open(BytesIO(result)).convert("RGBA")
    opaque_colors = [
        pixel[:3]
        for pixel in cast(
            list[tuple[int, int, int, int]],
            list(image.get_flattened_data()),
        )
        if pixel[3] > 0
    ]

    assert any(blue > 90 and red < 100 for red, _, blue in opaque_colors)
    assert not any(red > 180 and green < 80 for red, green, _ in opaque_colors)
