from io import BytesIO
from pathlib import Path
from typing import Any

import pytest
from backend.app.core.errors import ProviderNotConfiguredException
from backend.app.providers.base import GenerationSpec, GenerationStage
from backend.app.providers.cut_provider import CutGenerationProvider
from PIL import Image


class FakeCutRuntime:
    def __init__(self, *, fail: bool = False):
        self.fail = fail
        self.seen_source: Path | None = None

    def generate_png(self, source_path: Path) -> tuple[bytes, dict[str, Any]]:
        self.seen_source = source_path
        if self.fail:
            raise RuntimeError("private CUDA detail")
        output = BytesIO()
        Image.new("RGBA", (512, 512), (10, 20, 30, 255)).save(output, format="PNG")
        return output.getvalue(), {"gpu_seconds": 0.25, "device": "cuda"}


@pytest.mark.asyncio
async def test_cut_provider_generates_private_rgba_asset(tmp_path, isolated_external_services):
    source = tmp_path / "selfie.jpg"
    Image.new("RGB", (640, 480), (120, 100, 80)).save(source)
    runtime = FakeCutRuntime()
    provider = CutGenerationProvider(
        enabled=True,
        runtime=runtime,
        asset_store=isolated_external_services,
    )
    stages: list[tuple[GenerationStage, int]] = []

    result = await provider.generate(
        GenerationSpec(user_id="user-1", source_uri=str(source)),
        lambda stage, progress: stages.append((stage, progress)),
    )

    assert result.success is True
    assert result.provider == "cut"
    assert result.metrics["candidate_count"] == 1
    assert runtime.seen_source == source
    assert isolated_external_services.read_bytes(result.artifacts[0].relative_path)
    assert stages == [
        (GenerationStage.PREPARING, 20),
        (GenerationStage.GENERATING, 45),
        (GenerationStage.POSTPROCESSING, 85),
        (GenerationStage.COMPLETED, 100),
    ]


@pytest.mark.asyncio
async def test_cut_provider_requires_source_image(isolated_external_services):
    provider = CutGenerationProvider(
        enabled=True,
        runtime=FakeCutRuntime(),
        asset_store=isolated_external_services,
    )

    result = await provider.generate(GenerationSpec(user_id="user-1"))

    assert result.success is False
    assert result.error_code == "invalid_job_request"


@pytest.mark.asyncio
async def test_cut_provider_hides_runtime_failure(tmp_path, isolated_external_services):
    source = tmp_path / "selfie.png"
    Image.new("RGB", (256, 256)).save(source)
    provider = CutGenerationProvider(
        enabled=True,
        runtime=FakeCutRuntime(fail=True),
        asset_store=isolated_external_services,
    )

    result = await provider.generate(
        GenerationSpec(user_id="user-1", source_uri=str(source))
    )

    assert result.success is False
    assert result.error_code == "provider_unavailable"
    assert "private CUDA detail" not in (result.error_message or "")


@pytest.mark.asyncio
async def test_cut_provider_must_be_enabled(isolated_external_services):
    provider = CutGenerationProvider(
        enabled=False,
        runtime=FakeCutRuntime(),
        asset_store=isolated_external_services,
    )

    with pytest.raises(ProviderNotConfiguredException):
        await provider.generate(GenerationSpec(user_id="user-1", source_uri="unused"))
