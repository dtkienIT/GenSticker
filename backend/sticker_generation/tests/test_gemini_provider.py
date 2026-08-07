import base64
import json
from pathlib import Path

import httpx
import pytest
from PIL import Image

from sticker_generation.models import ImageGenerationRequest
from sticker_generation.providers.gemini import GeminiImageProvider


def _write_image(path: Path) -> None:
    Image.new("RGB", (32, 32), "white").save(path)


@pytest.mark.asyncio
async def test_gemini_provider_sends_inline_images_without_leaking_key(
    tmp_path: Path,
) -> None:
    source = tmp_path / "source.png"
    _write_image(source)
    seen_payloads: list[dict[str, object]] = []
    seen_headers: list[httpx.Headers] = []
    output = b"generated-png"

    def handler(request: httpx.Request) -> httpx.Response:
        seen_headers.append(request.headers)
        seen_payloads.append(json.loads(request.content))
        return httpx.Response(
            200,
            headers={"x-request-id": "gemini-request-1"},
            json={
                "candidates": [
                    {
                        "content": {
                            "parts": [
                                {
                                    "inlineData": {
                                        "mimeType": "image/png",
                                        "data": base64.b64encode(output).decode("ascii"),
                                    }
                                }
                            ]
                        }
                    }
                ]
            },
        )

    provider = GeminiImageProvider(
        api_key="secret-key",
        client=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
    )
    result = await provider.generate(
        ImageGenerationRequest(prompt="draw sticker", reference_images=(source,))
    )

    parts = seen_payloads[0]["contents"][0]["parts"]  # type: ignore[index]
    assert parts[0] == {"text": "draw sticker"}  # type: ignore[index]
    assert parts[1]["inlineData"]["mimeType"] == "image/png"  # type: ignore[index]
    assert seen_headers[0]["x-goog-api-key"] == "secret-key"
    assert "secret-key" not in str(seen_payloads)
    assert result.image_bytes == output
    assert result.provider == "gemini"
    assert result.request_id == "gemini-request-1"


@pytest.mark.asyncio
async def test_gemini_provider_rejects_oversized_reference_before_network(
    tmp_path: Path,
) -> None:
    source = tmp_path / "large.png"
    source.write_bytes(b"x" * 11)
    provider = GeminiImageProvider(api_key="secret-key", max_reference_bytes=10)

    with pytest.raises(ValueError, match="reference_image_too_large"):
        await provider.generate(
            ImageGenerationRequest(prompt="test", reference_images=(source,))
        )


@pytest.mark.asyncio
async def test_gemini_provider_rejects_invalid_or_oversized_output(
    tmp_path: Path,
) -> None:
    source = tmp_path / "source.png"
    _write_image(source)

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "candidates": [
                    {
                        "content": {
                            "parts": [
                                {
                                    "inlineData": {
                                        "mimeType": "image/png",
                                        "data": base64.b64encode(b"12345").decode("ascii"),
                                    }
                                }
                            ]
                        }
                    }
                ]
            },
        )

    provider = GeminiImageProvider(
        api_key="secret-key",
        client=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
        max_output_bytes=4,
    )
    with pytest.raises(ValueError, match="provider_output_too_large"):
        await provider.generate(
            ImageGenerationRequest(prompt="test", reference_images=(source,))
        )


@pytest.mark.asyncio
async def test_gemini_provider_reports_billing_limit_without_leaking_response(
    tmp_path: Path,
) -> None:
    source = tmp_path / "source.png"
    _write_image(source)

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(429, json={"error": {"message": "private quota details"}})

    provider = GeminiImageProvider(
        api_key="secret-key",
        client=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
    )
    with pytest.raises(RuntimeError, match="gemini_quota_or_billing_required") as error:
        await provider.generate(
            ImageGenerationRequest(prompt="test", reference_images=(source,))
        )

    assert "private quota details" not in str(error.value)
