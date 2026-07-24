from io import BytesIO
from types import SimpleNamespace

import numpy as np
import pytest
from backend.app.core.config import settings
from backend.app.core.errors import GenStickerException
from backend.app.providers.base import GenerationSpec
from backend.app.providers.instantid_provider import (
    DEFAULT_PROMPT,
    InstantIDStickerProvider,
    crop_face_context,
    trim_subject_to_chin,
)
from PIL import Image


def _face(
    bbox: tuple[float, float, float, float],
    *,
    embedding: tuple[float, ...] = (1.0, 0.0, 0.0, 0.0),
):
    x0, y0, x1, y1 = bbox
    return SimpleNamespace(
        bbox=np.asarray(bbox, dtype=np.float32),
        kps=np.asarray(
            [
                (x0 + 0.3 * (x1 - x0), y0 + 0.35 * (y1 - y0)),
                (x0 + 0.7 * (x1 - x0), y0 + 0.35 * (y1 - y0)),
                ((x0 + x1) / 2, (y0 + y1) / 2),
                (x0 + 0.35 * (x1 - x0), y0 + 0.75 * (y1 - y0)),
                (x0 + 0.65 * (x1 - x0), y0 + 0.75 * (y1 - y0)),
            ],
            dtype=np.float32,
        ),
        embedding=np.asarray(embedding, dtype=np.float32),
        normed_embedding=np.asarray(embedding, dtype=np.float32),
    )


class FakeInstantIDRuntime:
    device = "cuda"

    def __init__(self, source_faces=None) -> None:
        self.source_faces = source_faces or [_face((28, 8, 68, 52))]
        self.reference_face = _face((38, 24, 90, 86))
        self.generated_face = _face((36, 22, 92, 88))
        self.generated_faces = [self.generated_face]
        self.detect_calls = 0
        self.seen_seed = None
        self.seen_prompt = None

    def detect_faces(self, image: Image.Image):
        self.detect_calls += 1
        if self.detect_calls == 1:
            return self.source_faces
        if self.detect_calls == 2:
            return [self.reference_face]
        return self.generated_faces

    def draw_keypoints(self, image: Image.Image, face):
        return Image.new("RGB", image.size, "black")

    def generate(
        self,
        *,
        prompt,
        negative_prompt,
        face_embedding,
        keypoints,
        hair_canny,
        seed,
        size,
    ):
        self.seen_seed = seed
        self.seen_prompt = prompt
        assert negative_prompt
        assert np.array_equal(face_embedding, self.reference_face.embedding)
        assert keypoints.size == (size, size)
        assert hair_canny.size == (size, size)
        return Image.new("RGB", (size, size), (104, 82, 70))

    def segment(self, image: Image.Image):
        mask = Image.new("L", image.size, 0)
        for x in range(18, image.width - 18):
            for y in range(8, image.height - 8):
                mask.putpixel((x, y), 255)
        return mask

    def clear_cuda_cache(self):
        return None


def _source_image(path) -> None:
    image = Image.new("RGB", (96, 64), (220, 225, 235))
    for x in range(20, 76):
        for y in range(4, 62):
            image.putpixel((x, y), (55, 45, 40))
    image.save(path, format="PNG")


@pytest.mark.asyncio
async def test_instantid_pipeline_stores_one_transparent_rgba(
    tmp_path,
    monkeypatch,
    isolated_external_services,
):
    monkeypatch.setattr(settings, "STICKER_PROVIDER", "instantid")
    monkeypatch.setattr(settings, "STICKER_OUTPUT_SIZE", 128)
    monkeypatch.setattr(settings, "STICKER_OUTLINE_PX", 4)
    source_path = tmp_path / "source.png"
    _source_image(source_path)
    runtime = FakeInstantIDRuntime()
    provider = InstantIDStickerProvider(
        runtime=runtime,
        asset_store=isolated_external_services,
    )

    result = await provider.generate(
        GenerationSpec(user_id="user-1", source_uri=str(source_path), seed=731)
    )

    assert result.success is True
    assert result.provider == "instantid"
    assert result.metrics["candidate_count"] == 1
    assert result.metrics["identity_score"] == 1.0
    assert result.metrics["seed"] == 731
    assert result.metrics["gpu_seconds"] >= 0.0
    assert runtime.seen_seed == 731
    assert runtime.seen_prompt == DEFAULT_PROMPT
    assert len(result.artifacts) == 1
    assert result.artifacts[0].variant_name == "instantid_chibi_v3"
    stored = isolated_external_services.read_bytes(result.artifacts[0].relative_path)
    with Image.open(BytesIO(stored)) as image:
        assert image.mode == "RGBA"
        assert image.size == (128, 128)
        assert image.getchannel("A").getextrema() == (0, 255)
        assert image.getchannel("A").getbbox()[3] <= 89


@pytest.mark.asyncio
async def test_instantid_pipeline_rejects_no_face(
    tmp_path,
    monkeypatch,
    isolated_external_services,
):
    monkeypatch.setattr(settings, "STICKER_PROVIDER", "instantid")
    source_path = tmp_path / "source.png"
    _source_image(source_path)
    runtime = FakeInstantIDRuntime()
    runtime.source_faces = []
    provider = InstantIDStickerProvider(
        runtime=runtime,
        asset_store=isolated_external_services,
    )

    with pytest.raises(GenStickerException) as exc_info:
        await provider.generate(
            GenerationSpec(user_id="user-1", source_uri=str(source_path))
        )

    assert exc_info.value.code == "face_not_found"


@pytest.mark.asyncio
async def test_instantid_pipeline_rejects_multiple_faces(
    tmp_path,
    monkeypatch,
    isolated_external_services,
):
    monkeypatch.setattr(settings, "STICKER_PROVIDER", "instantid")
    source_path = tmp_path / "source.png"
    _source_image(source_path)
    runtime = FakeInstantIDRuntime(
        source_faces=[
            _face((8, 8, 38, 48)),
            _face((52, 8, 84, 48)),
        ]
    )
    provider = InstantIDStickerProvider(
        runtime=runtime,
        asset_store=isolated_external_services,
    )

    with pytest.raises(GenStickerException) as exc_info:
        await provider.generate(
            GenerationSpec(user_id="user-1", source_uri=str(source_path))
        )

    assert exc_info.value.code == "multiple_faces_not_supported"
    assert exc_info.value.details["faces_detected"] == 2


@pytest.mark.asyncio
async def test_instantid_pipeline_rejects_generated_image_without_a_face(
    tmp_path,
    monkeypatch,
    isolated_external_services,
):
    monkeypatch.setattr(settings, "STICKER_PROVIDER", "instantid")
    source_path = tmp_path / "source.png"
    _source_image(source_path)
    runtime = FakeInstantIDRuntime()
    runtime.generated_faces = []
    provider = InstantIDStickerProvider(
        runtime=runtime,
        asset_store=isolated_external_services,
    )

    with pytest.raises(GenStickerException) as exc_info:
        await provider.generate(
            GenerationSpec(user_id="user-1", source_uri=str(source_path))
        )

    assert exc_info.value.code == "face_not_found"


@pytest.mark.asyncio
async def test_instantid_pipeline_rejects_empty_foreground_mask(
    tmp_path,
    monkeypatch,
    isolated_external_services,
):
    monkeypatch.setattr(settings, "STICKER_PROVIDER", "instantid")
    source_path = tmp_path / "source.png"
    _source_image(source_path)
    runtime = FakeInstantIDRuntime()
    runtime.segment = lambda image: Image.new("L", image.size, 0)
    provider = InstantIDStickerProvider(
        runtime=runtime,
        asset_store=isolated_external_services,
    )

    with pytest.raises(GenStickerException) as exc_info:
        await provider.generate(
            GenerationSpec(user_id="user-1", source_uri=str(source_path))
        )

    assert exc_info.value.code == "subject_not_found"


@pytest.mark.asyncio
async def test_instantid_pipeline_reports_missing_source(
    tmp_path,
    monkeypatch,
    isolated_external_services,
):
    monkeypatch.setattr(settings, "STICKER_PROVIDER", "instantid")
    provider = InstantIDStickerProvider(
        runtime=FakeInstantIDRuntime(),
        asset_store=isolated_external_services,
    )

    result = await provider.generate(
        GenerationSpec(user_id="user-1", source_uri=str(tmp_path / "missing.png"))
    )

    assert result.success is False
    assert result.error_code == "source_asset_unavailable"


def test_face_crop_is_square_and_pads_outside_source():
    source = Image.new("RGB", (80, 60), "navy")
    cropped = crop_face_context(
        source,
        _face((0, 0, 30, 36)),
        scale=2.35,
        output_size=128,
    )

    assert cropped.size == (128, 128)
    assert cropped.getpixel((0, 0)) == (255, 255, 255)


def test_trim_subject_removes_everything_below_generated_chin():
    mask = Image.new("L", (128, 128), 255)
    trimmed = trim_subject_to_chin(mask, _face((36, 22, 92, 88)))

    assert trimmed.getbbox()[3] <= 89
    assert trimmed.getpixel((64, 100)) == 0
