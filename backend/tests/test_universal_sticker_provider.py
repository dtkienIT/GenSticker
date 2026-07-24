from io import BytesIO

import pytest
from backend.app.core.config import settings
from backend.app.core.errors import GenStickerException
from backend.app.providers.base import GenerationSpec
from backend.app.providers.universal_sticker_provider import UniversalStickerProvider
from PIL import Image


def _source_image(path) -> None:
    image = Image.new("RGB", (96, 64), (220, 225, 235))
    for x in range(28, 68):
        for y in range(10, 58):
            image.putpixel((x, y), (75, 120, 210))
    image.save(path, format="PNG")


def _subject_mask(image: Image.Image) -> Image.Image:
    mask = Image.new("L", image.size, 0)
    for x in range(28, 68):
        for y in range(10, 58):
            mask.putpixel((x, y), 255)
    return mask


@pytest.mark.asyncio
async def test_universal_pipeline_stores_transparent_rgba(
    tmp_path,
    monkeypatch,
    isolated_external_services,
):
    monkeypatch.setattr(settings, "STICKER_PROVIDER", "universal")
    monkeypatch.setattr(settings, "STICKER_OUTPUT_SIZE", 128)
    monkeypatch.setattr(settings, "STICKER_INNER_SIZE", 96)
    monkeypatch.setattr(settings, "STICKER_OUTLINE_PX", 4)
    source_path = tmp_path / "source.png"
    _source_image(source_path)
    provider = UniversalStickerProvider(
        device="cpu",
        asset_store=isolated_external_services,
        segmenter=_subject_mask,
    )

    result = await provider.generate(
        GenerationSpec(user_id="user-1", source_uri=str(source_path))
    )

    assert result.success is True
    assert result.provider == "universal"
    assert result.metrics["candidate_count"] == 1
    assert result.metrics["gpu_seconds"] == 0.0
    assert len(result.artifacts) == 1
    assert result.artifacts[0].variant_name == "universal_sticker"
    stored = isolated_external_services.read_bytes(result.artifacts[0].relative_path)
    with Image.open(BytesIO(stored)) as image:
        assert image.mode == "RGBA"
        assert image.size == (128, 128)
        assert image.getchannel("A").getextrema() == (0, 255)


@pytest.mark.asyncio
async def test_universal_pipeline_rejects_empty_mask(
    tmp_path,
    monkeypatch,
    isolated_external_services,
):
    monkeypatch.setattr(settings, "STICKER_PROVIDER", "universal")
    source_path = tmp_path / "source.png"
    _source_image(source_path)
    provider = UniversalStickerProvider(
        asset_store=isolated_external_services,
        segmenter=lambda image: Image.new("L", image.size, 0),
    )

    with pytest.raises(GenStickerException) as exc_info:
        await provider.generate(
            GenerationSpec(user_id="user-1", source_uri=str(source_path))
        )

    assert exc_info.value.code == "subject_not_found"


@pytest.mark.asyncio
async def test_universal_pipeline_reports_missing_source(
    tmp_path,
    monkeypatch,
    isolated_external_services,
):
    monkeypatch.setattr(settings, "STICKER_PROVIDER", "universal")
    provider = UniversalStickerProvider(
        asset_store=isolated_external_services,
        segmenter=_subject_mask,
    )

    result = await provider.generate(
        GenerationSpec(user_id="user-1", source_uri=str(tmp_path / "missing.png"))
    )

    assert result.success is False
    assert result.error_code == "source_asset_unavailable"
