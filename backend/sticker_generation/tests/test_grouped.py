from io import BytesIO
from pathlib import Path

import pytest
from PIL import Image, ImageDraw, ImageOps

from sticker_generation.catalog import DEFAULT_STICKER_CATALOG
from sticker_generation.grouped import GroupedStickerGenerator
from sticker_generation.models import ImageGenerationRequest, ImageGenerationResult


def _mock_art(size: int = 1024) -> bytes:
    image = Image.new("RGB", (size, size), "white")
    draw = ImageDraw.Draw(image)
    half = size // 2
    for row in range(2):
        for col in range(2):
            left = col * half + 80
            top = row * half + 80
            draw.ellipse(
                (left, top, left + half - 160, top + half - 160),
                fill=(50 + col * 60, 80 + row * 60, 140),
            )
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def _mock_pack_sheet(
    width: int = 1000,
    height: int = 800,
    *,
    columns: int = 5,
    rows: int = 4,
) -> bytes:
    image = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    cell_width = width // columns
    cell_height = height // rows
    for row in range(rows):
        for col in range(columns):
            index = row * columns + col
            draw.rectangle(
                (
                    col * cell_width + 12,
                    row * cell_height + 12,
                    (col + 1) * cell_width - 12,
                    (row + 1) * cell_height - 12,
                ),
                fill=(40 + index * 7, 70 + index * 5, 120 + index * 3),
            )
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def _mock_eight_sheet(sheet_index: int) -> bytes:
    image = Image.new("RGBA", (1500, 1000), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    for row in range(2):
        for col in range(4):
            local_index = row * 4 + col
            index = (sheet_index - 1) * 8 + local_index
            draw.rectangle(
                (col * 375 + 20, row * 500 + 20, (col + 1) * 375 - 20, (row + 1) * 500 - 20),
                fill=(40 + index * 7, 70 + index * 5, 120 + index * 3),
            )
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def _mock_three_by_two_sheet(
    *,
    horizontal_inset: int = 40,
    vertical_inset: int = 28,
) -> bytes:
    image = Image.new("RGBA", (1536, 1024), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    for row in range(2):
        for column in range(3):
            index = row * 3 + column
            draw.ellipse(
                (
                    column * 512 + horizontal_inset,
                    row * 512 + vertical_inset,
                    (column + 1) * 512 - horizontal_inset,
                    (row + 1) * 512 - vertical_inset,
                ),
                fill=(
                    40 + index * 25,
                    70 + index * 15,
                    120 + index * 10,
                    255,
                ),
            )
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


class FakeProvider:
    def __init__(self) -> None:
        self.calls: list[ImageGenerationRequest] = []

    async def generate(self, request):  # type: ignore[no-untyped-def]
        self.calls.append(request)
        sheet_index = request.metadata.get("sheet_index")
        return ImageGenerationResult(
            image_bytes=(
                _mock_eight_sheet(int(sheet_index))
                if sheet_index is not None
                else _mock_art()
            ),
            provider="fake",
            model="fake-image",
            latency_seconds=0.01,
        )


@pytest.mark.asyncio
async def test_grouped_generator_uses_four_calls_and_three_eight_cell_sheets(
    tmp_path: Path,
) -> None:
    selfie = tmp_path / "selfie.png"
    Image.new("RGB", (256, 256), "white").save(selfie)
    provider = FakeProvider()
    progress: list[tuple[str, int, int]] = []
    generator = GroupedStickerGenerator(provider=provider, canvas_size=128)

    paths = await generator.generate(
        selfie_path=selfie,
        output_dir=tmp_path / "output",
        style_prompt="clean hand-drawn portrait sticker",
        on_progress=lambda stage, current, total: progress.append(
            (stage, current, total)
        ),
    )

    assert len(provider.calls) == 4
    assert len(paths) == 20
    assert all(path.is_file() for path in paths)
    assert provider.calls[0].reference_images[0].name == "selfie.png"
    expected_ranges = ((1, 8, 8), (9, 16, 8), (17, 20, 4))
    for sheet_index, (call, expected_range) in enumerate(
        zip(provider.calls[1:], expected_ranges, strict=True), start=1
    ):
        assert len(call.reference_images) == 3
        layout_guide = call.reference_images[2]
        assert layout_guide.name == "four-by-two-layout-guide.png"
        with Image.open(layout_guide) as guide:
            assert guide.size == (1536, 1024)
        assert call.metadata == {
            "stage": "pack_sheet",
            "sheet_index": sheet_index,
            "first_order": expected_range[0],
            "last_order": expected_range[1],
            "keep_count": expected_range[2],
        }
        assert call.size == "1536x1024"
        assert "malformed face" in call.negative_prompt
        assert "missing mouth" in call.negative_prompt
        assert "extra fingers" in call.negative_prompt
        assert "4 columns by 2 rows" in call.prompt
        assert "Reference image 3" in call.prompt
        assert "row 2 column 4" in call.prompt
    assert "reserve filler" in provider.calls[3].prompt.lower()
    assert progress[-1] == ("groups", 3, 3)


@pytest.mark.asyncio
async def test_grouped_generator_retries_one_transient_sheet_timeout(
    tmp_path: Path,
) -> None:
    selfie = tmp_path / "selfie.png"
    Image.new("RGB", (256, 256), "white").save(selfie)

    class TimeoutOnceProvider(FakeProvider):
        def __init__(self) -> None:
            super().__init__()
            self.did_timeout = False

        async def generate(self, request):  # type: ignore[no-untyped-def]
            self.calls.append(request)
            sheet_index = request.metadata.get("sheet_index")
            if sheet_index == 1 and not self.did_timeout:
                self.did_timeout = True
                raise RuntimeError("openai_timeout")
            return ImageGenerationResult(
                image_bytes=(
                    _mock_eight_sheet(int(sheet_index))
                    if sheet_index is not None
                    else _mock_art()
                ),
                provider="fake",
                model="fake-image",
                latency_seconds=0.01,
            )

    provider = TimeoutOnceProvider()
    generator = GroupedStickerGenerator(
        provider=provider,
        canvas_size=128,
        max_provider_attempts=2,
        retry_base_delay_seconds=0,
    )

    paths = await generator.generate(
        selfie_path=selfie,
        output_dir=tmp_path / "output",
        style_prompt="clean hand-drawn portrait sticker",
    )

    assert len(paths) == 20
    assert [call.metadata.get("sheet_index") for call in provider.calls].count(1) == 2
    assert len(provider.calls) == 5


def test_eight_sheet_split_returns_eight_cells_in_row_major_order() -> None:
    cells = GroupedStickerGenerator._split_eight_sheet(_mock_eight_sheet(2))

    assert len(cells) == 8
    decoded = [Image.open(BytesIO(cell)).convert("RGB") for cell in cells]
    assert all(image.size == (375, 500) for image in decoded)
    assert [image.getpixel((187, 250)) for image in decoded] == [
        (40 + index * 7, 70 + index * 5, 120 + index * 3)
        for index in range(8, 16)
    ]


def test_eight_sheet_split_finds_shifted_gutters_near_nominal_boundaries() -> None:
    image = Image.new("RGBA", (1536, 1024), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    column_edges = (0, 433, 817, 1201, 1536)
    for row in range(2):
        for column in range(4):
            index = row * 4 + column
            draw.rectangle(
                (
                    column_edges[column] + 8,
                    row * 512 + 20,
                    column_edges[column + 1] - 8,
                    (row + 1) * 512 - 20,
                ),
                fill=(40 + index * 7, 70 + index * 5, 120 + index * 3),
            )
    buffer = BytesIO()
    image.save(buffer, format="PNG")

    foreground = GroupedStickerGenerator._foreground_mask(image)
    *_, detected_column_edges, _ = GroupedStickerGenerator._adaptive_grid_quality(
        foreground,
        4,
        2,
    )
    cells = GroupedStickerGenerator._split_eight_sheet(buffer.getvalue())

    assert detected_column_edges[1] in range(430, 438)
    assert len(cells) == 8
    decoded = [Image.open(BytesIO(cell)).convert("RGBA") for cell in cells]
    assert decoded[1].getpixel((0, decoded[1].height // 2))[3] == 0
    assert [cell.getpixel((cell.width // 2, cell.height // 2)) for cell in decoded] == [
        (40 + index * 7, 70 + index * 5, 120 + index * 3, 255)
        for index in range(8)
    ]


def test_eight_sheet_split_rejects_transparent_three_by_two_layout() -> None:
    with pytest.raises(ValueError, match="pack_sheet_grid_not_detected"):
        GroupedStickerGenerator._split_eight_sheet(_mock_three_by_two_sheet())


def test_eight_sheet_split_rejects_sparse_three_by_two_layout() -> None:
    image_bytes = _mock_three_by_two_sheet(
        horizontal_inset=140,
        vertical_inset=150,
    )
    foreground = GroupedStickerGenerator._foreground_mask(
        Image.open(BytesIO(image_bytes)).convert("RGBA")
    )
    cut_score, minimum_occupancy, *_ = (
        GroupedStickerGenerator._adaptive_grid_quality(foreground, 4, 2)
    )

    assert 0.10 < cut_score < 0.45
    assert minimum_occupancy > 0.03
    with pytest.raises(ValueError, match="pack_sheet_grid_not_detected"):
        GroupedStickerGenerator._split_eight_sheet(image_bytes)


def test_eight_sheet_split_handles_smooth_opaque_background() -> None:
    gradient = Image.linear_gradient("L").resize((1500, 1000))
    image = ImageOps.colorize(gradient, black=(205, 208, 214), white=(244, 246, 248)).convert("RGBA")
    draw = ImageDraw.Draw(image)
    for row in range(2):
        for column in range(4):
            index = row * 4 + column
            draw.ellipse(
                (
                    column * 375 + 45,
                    row * 500 + 45,
                    (column + 1) * 375 - 45,
                    (row + 1) * 500 - 45,
                ),
                fill=(30 + index * 8, 55 + index * 5, 95 + index * 3, 255),
            )
    buffer = BytesIO()
    image.save(buffer, format="PNG")

    assert len(GroupedStickerGenerator._split_eight_sheet(buffer.getvalue())) == 8


def test_eight_sheet_split_rejects_narrow_character_crossing_gutter() -> None:
    image = Image.open(BytesIO(_mock_eight_sheet(1))).convert("RGBA")
    draw = ImageDraw.Draw(image)
    draw.rectangle((345, 420, 405, 580), fill=(20, 20, 20, 255))
    buffer = BytesIO()
    image.save(buffer, format="PNG")

    with pytest.raises(ValueError, match="pack_sheet_grid_not_detected"):
        GroupedStickerGenerator._split_eight_sheet(buffer.getvalue())


def test_eight_sheet_split_accepts_small_decorative_accent_near_gutter() -> None:
    image = Image.open(BytesIO(_mock_eight_sheet(1))).convert("RGBA")
    draw = ImageDraw.Draw(image)
    draw.rectangle((345, 460, 405, 540), fill=(20, 20, 20, 255))
    buffer = BytesIO()
    image.save(buffer, format="PNG")

    assert len(GroupedStickerGenerator._split_eight_sheet(buffer.getvalue())) == 8


def test_eight_sheet_split_accepts_fragmented_decorations_near_gutter() -> None:
    image = Image.open(BytesIO(_mock_eight_sheet(1))).convert("RGBA")
    draw = ImageDraw.Draw(image)
    draw.rectangle((345, 325, 405, 455), fill=(20, 20, 20, 255))
    draw.rectangle((345, 650, 405, 705), fill=(20, 20, 20, 255))
    buffer = BytesIO()
    image.save(buffer, format="PNG")

    assert len(GroupedStickerGenerator._split_eight_sheet(buffer.getvalue())) == 8


def test_eight_sheet_split_accepts_dense_square_four_by_two_layout() -> None:
    image = Image.new("RGBA", (1200, 1200), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    for row in range(2):
        for column in range(4):
            index = row * 4 + column
            draw.rounded_rectangle(
                (
                    column * 300 + 8,
                    row * 600 + 3,
                    (column + 1) * 300 - 8,
                    (row + 1) * 600 - 3,
                ),
                radius=60,
                fill=(40 + index * 7, 70 + index * 5, 120 + index * 3, 255),
            )
    buffer = BytesIO()
    image.save(buffer, format="PNG")

    cells = GroupedStickerGenerator._split_eight_sheet(buffer.getvalue())

    assert len(cells) == 8
    assert all(Image.open(BytesIO(cell)).size[1] > Image.open(BytesIO(cell)).size[0] for cell in cells)


def test_eight_sheet_split_removes_checkerboard_background() -> None:
    image = Image.new("RGBA", (1536, 1024), "white")
    draw = ImageDraw.Draw(image)
    tile_size = 24
    for top in range(0, image.height, tile_size):
        for left in range(0, image.width, tile_size):
            shades = (180, 215, 245)
            shade = shades[(left // tile_size + top // tile_size) % len(shades)]
            draw.rectangle(
                (left, top, left + tile_size, top + tile_size),
                fill=(shade, shade, shade, 255),
            )
    for row in range(2):
        for column in range(4):
            draw.ellipse(
                (
                    column * 384 + 38,
                    row * 512 + 28,
                    (column + 1) * 384 - 38,
                    (row + 1) * 512 - 28,
                ),
                fill=(80 + column * 20, 60 + row * 30, 140, 255),
            )
    buffer = BytesIO()
    image.save(buffer, format="PNG")

    cells = GroupedStickerGenerator._split_eight_sheet(buffer.getvalue())

    assert len(cells) == 8
    decoded = [Image.open(BytesIO(cell)).convert("RGBA") for cell in cells]
    assert all(cell.getpixel((0, 0))[3] == 0 for cell in decoded)
    assert all(GroupedStickerGenerator._transparent_ratio(cell) > 0.25 for cell in decoded)
    assert all(cell.getpixel((cell.width // 2, cell.height // 2))[3] == 255 for cell in decoded)


@pytest.mark.asyncio
async def test_resume_reuses_canonical_and_completed_first_sheet(tmp_path: Path) -> None:
    output_dir = tmp_path / "result"
    inputs_dir = output_dir / "inputs"
    stickers_dir = output_dir / "stickers"
    inputs_dir.mkdir(parents=True)
    stickers_dir.mkdir(parents=True)
    Image.new("RGB", (256, 256), "white").save(inputs_dir / "selfie.png")
    Image.new("RGB", (256, 256), "white").save(output_dir / "canonical.png")
    GroupedStickerGenerator._create_four_by_two_layout_guide(
        output_dir / "four-by-two-layout-guide.png"
    )
    for template in DEFAULT_STICKER_CATALOG[:16]:
        Image.new("RGBA", (128, 128), "white").save(
            stickers_dir / template.reference_filename
        )
    invalid_raw_sheet = _mock_three_by_two_sheet()
    raw_sheet_path = output_dir / "raw-sheet-3.png"
    raw_sheet_path.write_bytes(invalid_raw_sheet)

    provider = FakeProvider()
    generator = GroupedStickerGenerator(provider=provider, canvas_size=128)
    paths = await generator.resume(
        output_dir=output_dir,
        style_prompt="polished 3D chibi",
    )

    assert len(paths) == 20
    assert len(provider.calls) == 1
    assert provider.calls[0].metadata["sheet_index"] == 3
    assert provider.calls[0].metadata["keep_count"] == 4
    assert raw_sheet_path.read_bytes() == _mock_eight_sheet(3)


@pytest.mark.asyncio
async def test_resume_reuses_valid_raw_sheet_without_another_api_call(
    tmp_path: Path,
) -> None:
    output_dir = tmp_path / "result"
    inputs_dir = output_dir / "inputs"
    stickers_dir = output_dir / "stickers"
    inputs_dir.mkdir(parents=True)
    stickers_dir.mkdir(parents=True)
    Image.new("RGB", (256, 256), "white").save(inputs_dir / "selfie.png")
    Image.new("RGB", (256, 256), "white").save(output_dir / "canonical.png")
    GroupedStickerGenerator._create_four_by_two_layout_guide(
        output_dir / "four-by-two-layout-guide.png"
    )
    for template in DEFAULT_STICKER_CATALOG[:8]:
        Image.new("RGBA", (128, 128), "white").save(
            stickers_dir / template.reference_filename
        )
    raw_second_sheet = _mock_eight_sheet(2)
    (output_dir / "raw-sheet-2.png").write_bytes(raw_second_sheet)

    previews: list[bytes] = []
    provider = FakeProvider()
    generator = GroupedStickerGenerator(provider=provider, canvas_size=128)
    paths = await generator.resume(
        output_dir=output_dir,
        style_prompt="polished 3D chibi",
        on_sheet=previews.append,
    )

    assert len(paths) == 20
    assert [call.metadata["sheet_index"] for call in provider.calls] == [3]
    assert previews[0] == raw_second_sheet


def test_pack_sheet_split_returns_twenty_cells_in_row_major_order() -> None:
    cells = GroupedStickerGenerator._split_pack_sheet(_mock_pack_sheet())

    assert len(cells) == 20
    decoded = [Image.open(BytesIO(cell)).convert("RGB") for cell in cells]
    assert all(image.size == (200, 200) for image in decoded)
    assert [image.getpixel((100, 100)) for image in decoded] == [
        (40 + index * 7, 70 + index * 5, 120 + index * 3)
        for index in range(20)
    ]


def test_pack_sheet_split_detects_transposed_four_by_five_layout() -> None:
    cells = GroupedStickerGenerator._split_pack_sheet(
        _mock_pack_sheet(1024, 1024, columns=4, rows=5)
    )

    assert len(cells) == 20
    decoded = [Image.open(BytesIO(cell)).convert("RGB") for cell in cells]
    assert [image.getpixel((image.width // 2, image.height // 2)) for image in decoded] == [
        (40 + index * 7, 70 + index * 5, 120 + index * 3)
        for index in range(20)
    ]


def test_pack_sheet_split_rejects_sheet_without_internal_gutters() -> None:
    image = Image.new("RGBA", (1024, 1024), (80, 90, 100, 255))
    buffer = BytesIO()
    image.save(buffer, format="PNG")

    with pytest.raises(ValueError, match="pack_sheet_grid_not_detected"):
        GroupedStickerGenerator._split_pack_sheet(buffer.getvalue())


def test_pack_sheet_split_rejects_cells_with_only_tiny_marks() -> None:
    image = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    for row in range(4):
        for column in range(5):
            center_x = column * 1024 // 5 + 1024 // 10
            center_y = row * 1024 // 4 + 1024 // 8
            draw.ellipse(
                (center_x - 5, center_y - 5, center_x + 5, center_y + 5),
                fill=(255, 0, 0, 255),
            )
    buffer = BytesIO()
    image.save(buffer, format="PNG")

    with pytest.raises(ValueError, match="pack_sheet_grid_not_detected"):
        GroupedStickerGenerator._split_pack_sheet(buffer.getvalue())


def test_foreground_detection_ignores_isolated_transparent_pixel() -> None:
    image = Image.new("RGBA", (1000, 800), (255, 255, 255, 255))
    draw = ImageDraw.Draw(image)
    for row in range(4):
        for column in range(5):
            draw.rectangle(
                (
                    column * 200 + 20,
                    row * 200 + 20,
                    (column + 1) * 200 - 20,
                    (row + 1) * 200 - 20,
                ),
                fill=(40, 80, 120, 255),
            )
    image.putpixel((0, 0), (255, 255, 255, 0))
    buffer = BytesIO()
    image.save(buffer, format="PNG")

    assert len(GroupedStickerGenerator._split_pack_sheet(buffer.getvalue())) == 20


@pytest.mark.asyncio
async def test_generator_exposes_raw_sheet_before_quality_rejection(
    tmp_path: Path,
) -> None:
    selfie = tmp_path / "selfie.png"
    Image.new("RGB", (256, 256), "white").save(selfie)
    rejected_sheet = Image.new("RGBA", (1024, 1024), (80, 90, 100, 255))
    buffer = BytesIO()
    rejected_sheet.save(buffer, format="PNG")

    class RejectedSheetProvider(FakeProvider):
        async def generate(self, request):  # type: ignore[no-untyped-def]
            self.calls.append(request)
            return ImageGenerationResult(
                image_bytes=(
                    buffer.getvalue()
                    if request.metadata.get("stage") == "pack_sheet"
                    else _mock_art()
                ),
                provider="fake",
                model="fake-image",
                latency_seconds=0.01,
            )

    previews: list[bytes] = []
    generator = GroupedStickerGenerator(provider=RejectedSheetProvider())

    with pytest.raises(ValueError, match="pack_sheet_grid_not_detected"):
        await generator.generate(
            selfie_path=selfie,
            output_dir=tmp_path / "output",
            style_prompt="clean cartoon",
            on_sheet=previews.append,
        )

    assert previews == [buffer.getvalue()]


@pytest.mark.asyncio
async def test_generator_rejects_invalid_canonical_before_requesting_sheets(
    tmp_path: Path,
) -> None:
    selfie = tmp_path / "selfie.png"
    Image.new("RGB", (256, 256), "white").save(selfie)

    class InvalidCanonicalProvider(FakeProvider):
        async def generate(self, request):  # type: ignore[no-untyped-def]
            self.calls.append(request)
            return ImageGenerationResult(
                image_bytes=b"not-an-image",
                provider="fake",
                model="fake-image",
                latency_seconds=0.01,
            )

    provider = InvalidCanonicalProvider()
    generator = GroupedStickerGenerator(provider=provider)

    with pytest.raises(ValueError, match="canonical_invalid_image"):
        await generator.generate(
            selfie_path=selfie,
            output_dir=tmp_path / "output",
            style_prompt="clean cartoon",
        )

    assert len(provider.calls) == 1
