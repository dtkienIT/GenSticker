from io import BytesIO
from typing import Any

import pytest
from backend.app.core.errors import ProviderNotConfiguredException
from backend.app.providers import replicate_provider as replicate_provider_module
from backend.app.providers.base import GenerationSpec, GenerationStage
from backend.app.providers.mock_provider import MockGenerationProvider
from backend.app.providers.replicate_provider import (
    FACE_TO_STICKER_MODEL,
    STICKER_MAKER_MODEL,
    ReplicateGenerationProvider,
)
from PIL import Image as PILImage


def create_png_bytes() -> bytes:
    buffer = BytesIO()
    PILImage.new("RGBA", (48, 48), color=(100, 20, 200, 255)).save(buffer, format="PNG")
    return buffer.getvalue()


class FakeFileOutput:
    def __init__(self, content: bytes, url: str = "https://replicate.delivery/output.png"):
        self.content = content
        self.url = url

    def read(self) -> bytes:
        return self.content


class FakeReplicateClient:
    def __init__(self, output: Any = None, error: Exception | None = None):
        self.output = output
        self.error = error
        self.calls: list[tuple[str, dict[str, Any]]] = []

    def run(self, ref: str, input: dict[str, Any]) -> Any:
        self.calls.append((ref, input))
        if self.error:
            raise self.error
        return self.output


class FakeResponse:
    def __init__(self, content: bytes):
        self.content = content

    def raise_for_status(self) -> None:
        return None


class FakeHttpClient:
    def __init__(self, content: bytes):
        self.content = content
        self.requested_urls: list[str] = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, traceback):
        del exc_type, exc, traceback
        return False

    async def get(self, url: str) -> FakeResponse:
        self.requested_urls.append(url)
        return FakeResponse(self.content)


def test_provider_builds_scoped_replicate_client(monkeypatch, isolated_external_services):
    captured: dict[str, str] = {}

    def create_client(*, api_token: str):
        captured["api_token"] = api_token
        return FakeReplicateClient([])

    monkeypatch.setattr(replicate_provider_module.replicate, "Client", create_client)

    provider = ReplicateGenerationProvider(
        api_token="test-token",
        asset_store=isolated_external_services,
    )

    assert isinstance(provider.client, FakeReplicateClient)
    assert captured == {"api_token": "test-token"}


@pytest.mark.asyncio
async def test_face_generation_uses_source_uri_file_output_and_enum_stages(
    isolated_external_services,
):
    replicate_client = FakeReplicateClient([FakeFileOutput(create_png_bytes())])
    provider = ReplicateGenerationProvider(
        api_token="test-token",
        client=replicate_client,
        asset_store=isolated_external_services,
    )
    stages: list[tuple[GenerationStage, int]] = []
    source_uri = "https://storage.example/signed-selfie.png"

    result = await provider.generate(
        GenerationSpec(
            user_id="user-1",
            kind="selfie_to_sticker",
            source_asset_id="asset-1",
            source_uri=source_uri,
            prompt="friendly portrait",
            seed=7,
        ),
        lambda stage, progress: stages.append((stage, progress)),
    )

    assert result.success is True
    assert len(result.artifacts) == 1
    assert isolated_external_services.read_bytes(result.artifacts[0].relative_path)
    model_ref, model_input = replicate_client.calls[0]
    assert model_ref == FACE_TO_STICKER_MODEL
    assert model_input["image"] == source_uri
    assert model_input["seed"] == 7
    assert stages == [
        (GenerationStage.PREPARING, 10),
        (GenerationStage.GENERATING, 40),
        (GenerationStage.POSTPROCESSING, 80),
        (GenerationStage.COMPLETED, 100),
    ]


@pytest.mark.asyncio
async def test_text_generation_uses_current_model_and_downloads_url_output(
    isolated_external_services,
):
    output_url = "https://replicate.delivery/sticker.png"
    replicate_client = FakeReplicateClient([output_url])
    http_client = FakeHttpClient(create_png_bytes())
    provider = ReplicateGenerationProvider(
        api_token="test-token",
        client=replicate_client,
        asset_store=isolated_external_services,
        http_client_factory=lambda: http_client,
    )

    result = await provider.generate(
        GenerationSpec(user_id="user-1", prompt="a happy cat", seed=99)
    )

    assert result.success is True
    assert http_client.requested_urls == [output_url]
    model_ref, model_input = replicate_client.calls[0]
    assert model_ref == STICKER_MAKER_MODEL
    assert model_input["prompt"] == "a happy cat"
    assert model_input["seed"] == 99
    assert model_input["output_format"] == "png"


@pytest.mark.asyncio
async def test_face_generation_rejects_asset_id_without_source_uri(isolated_external_services):
    replicate_client = FakeReplicateClient([FakeFileOutput(create_png_bytes())])
    provider = ReplicateGenerationProvider(
        api_token="test-token",
        client=replicate_client,
        asset_store=isolated_external_services,
    )

    result = await provider.generate(
        GenerationSpec(
            user_id="user-1",
            kind="canonical_generation",
            source_asset_id="asset-1",
        )
    )

    assert result.success is False
    assert result.error_code == "invalid_job_request"
    assert replicate_client.calls == []


@pytest.mark.asyncio
async def test_empty_or_failed_replicate_outputs_have_stable_error_codes(
    isolated_external_services,
):
    empty_provider = ReplicateGenerationProvider(
        api_token="test-token",
        client=FakeReplicateClient([]),
        asset_store=isolated_external_services,
    )
    unavailable_provider = ReplicateGenerationProvider(
        api_token="test-token",
        client=FakeReplicateClient(error=RuntimeError("secret upstream detail")),
        asset_store=isolated_external_services,
    )

    empty_result = await empty_provider.generate(GenerationSpec(user_id="user-1"))
    unavailable_result = await unavailable_provider.generate(GenerationSpec(user_id="user-1"))

    assert empty_result.success is False
    assert empty_result.error_code == "generation_failed"
    assert unavailable_result.success is False
    assert unavailable_result.error_code == "provider_unavailable"
    assert "secret upstream detail" not in (unavailable_result.error_message or "")


@pytest.mark.asyncio
async def test_multi_output_failure_removes_artifact_saved_before_invalid_item(
    isolated_external_services,
):
    replicate_client = FakeReplicateClient(
        [FakeFileOutput(create_png_bytes()), FakeFileOutput(b"not-an-image")]
    )
    provider = ReplicateGenerationProvider(
        api_token="test-token",
        client=replicate_client,
        asset_store=isolated_external_services,
    )

    result = await provider.generate(GenerationSpec(user_id="user-1"))

    assert result.success is False
    assert result.error_code == "generation_failed"
    assert list(isolated_external_services.root_dir.rglob("*.png")) == []


@pytest.mark.asyncio
async def test_missing_token_never_calls_replicate(isolated_external_services):
    provider = ReplicateGenerationProvider(
        api_token="",
        asset_store=isolated_external_services,
    )

    with pytest.raises(ProviderNotConfiguredException):
        await provider.generate(GenerationSpec(user_id="user-1"))


@pytest.mark.asyncio
async def test_mock_provider_failure_uses_contract_error_code(isolated_external_services):
    provider = MockGenerationProvider(
        asset_store=isolated_external_services,
        delay_ms=0,
        simulate_failure=True,
    )

    result = await provider.generate(GenerationSpec(user_id="user-1"))

    assert result.success is False
    assert result.error_code == "generation_failed"
