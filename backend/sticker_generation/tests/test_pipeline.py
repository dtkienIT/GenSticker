from pathlib import Path

import pytest
from PIL import Image, ImageDraw

from sticker_generation.catalog import DEFAULT_STICKER_CATALOG
from sticker_generation.models import ImageGenerationResult
from sticker_generation.pipeline import StickerPackGenerator


class FakeProvider:
    def __init__(self, fail_once_for: str | None = None) -> None:
        self.fail_once_for = fail_once_for
        self.calls: list[tuple[str, tuple[str, ...]]] = []
        self.attempts: dict[str, int] = {}

    async def generate(self, request):  # type: ignore[no-untyped-def]
        template_id = str(request.metadata.get("template_id", "canonical"))
        references = tuple(path.name for path in request.reference_images)
        self.calls.append((template_id, references))
        self.attempts[template_id] = self.attempts.get(template_id, 0) + 1
        if template_id == self.fail_once_for and self.attempts[template_id] == 1:
            raise RuntimeError("temporary failure")
        output = request.reference_images[-1].read_bytes()
        return ImageGenerationResult(
            image_bytes=output,
            provider="fake",
            model="fake-model",
            request_id=f"req-{template_id}-{self.attempts[template_id]}",
            latency_seconds=0.01,
            estimated_cost_usd=0.02,
        )


def _write_image(path: Path, color: str) -> None:
    image = Image.new("RGB", (64, 64), "white")
    ImageDraw.Draw(image).ellipse((12, 8, 52, 58), fill=color)
    image.save(path)


@pytest.mark.asyncio
async def test_pack_generation_uses_same_identity_inputs_and_retries_only_failed_item(
    tmp_path: Path,
) -> None:
    selfie = tmp_path / "selfie.png"
    canonical = tmp_path / "canonical.png"
    pose_dir = tmp_path / "poses"
    output_dir = tmp_path / "output"
    pose_dir.mkdir()
    _write_image(selfie, "pink")
    _write_image(canonical, "blue")
    for template in DEFAULT_STICKER_CATALOG[:2]:
        _write_image(pose_dir / template.reference_filename, "green")

    provider = FakeProvider(fail_once_for=DEFAULT_STICKER_CATALOG[1].template_id)
    generator = StickerPackGenerator(provider=provider, max_quality_retries=1, concurrency=2)
    result = await generator.generate_pack(
        selfie_path=selfie,
        canonical_path=canonical,
        pose_reference_dir=pose_dir,
        output_dir=output_dir,
        templates=DEFAULT_STICKER_CATALOG[:2],
    )

    assert len(result.items) == 2
    assert provider.attempts[DEFAULT_STICKER_CATALOG[0].template_id] == 1
    assert provider.attempts[DEFAULT_STICKER_CATALOG[1].template_id] == 2
    assert all(call[1][:2] == ("selfie.png", "canonical.png") for call in provider.calls)
    assert (output_dir / "manifest.json").is_file()
    assert all(Path(item.output_path).is_file() for item in result.items)


@pytest.mark.asyncio
async def test_pack_generation_fails_closed_when_pose_reference_is_missing(tmp_path: Path) -> None:
    selfie = tmp_path / "selfie.png"
    canonical = tmp_path / "canonical.png"
    pose_dir = tmp_path / "poses"
    pose_dir.mkdir()
    _write_image(selfie, "pink")
    _write_image(canonical, "blue")

    generator = StickerPackGenerator(provider=FakeProvider())
    with pytest.raises(FileNotFoundError, match="pose_reference_missing"):
        await generator.generate_pack(
            selfie_path=selfie,
            canonical_path=canonical,
            pose_reference_dir=pose_dir,
            output_dir=tmp_path / "output",
            templates=DEFAULT_STICKER_CATALOG[:1],
        )


@pytest.mark.asyncio
async def test_canonical_generation_sanitizes_input_and_writes_manifest(tmp_path: Path) -> None:
    selfie = tmp_path / "selfie.jpg"
    _write_image(selfie, "pink")
    provider = FakeProvider()
    generator = StickerPackGenerator(provider=provider, canvas_size=128)

    paths = await generator.generate_canonical_candidates(
        selfie_path=selfie,
        output_dir=tmp_path / "canonical",
        candidate_count=2,
    )

    assert len(paths) == 2
    assert all(path.is_file() for path in paths)
    assert all(call[1] == ("selfie.png",) for call in provider.calls)
    assert (tmp_path / "canonical" / "canonical_manifest.json").is_file()
