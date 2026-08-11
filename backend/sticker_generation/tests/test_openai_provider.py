import base64
from pathlib import Path

import httpx
import pytest
from PIL import Image

from sticker_generation.models import ImageGenerationRequest
from sticker_generation.providers.openai_image import OpenAIImageProvider


def _write_image(path: Path) -> None:
    Image.new("RGB", (32, 32), "white").save(path)


@pytest.mark.asyncio
async def test_openai_provider_sends_multiple_images_and_extracts_result(
    tmp_path: Path,
) -> None:
    first = tmp_path / "selfie.png"
    second = tmp_path / "pose.png"
    _write_image(first)
    _write_image(second)
    output = b"generated-png"
    seen_body = ""
    seen_headers: httpx.Headers | None = None
    seen_url = ""

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal seen_body, seen_headers, seen_url
        seen_headers = request.headers
        seen_url = str(request.url)
        seen_body = request.content.decode("latin1")
        return httpx.Response(
            200,
            headers={"x-request-id": "openai-request-1"},
            json={"data": [{"b64_json": base64.b64encode(output).decode("ascii")}]},
        )

    provider = OpenAIImageProvider(
        api_key="secret-key",
        base_url="https://direct.shopaikey.com/v1/",
        client=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
    )
    result = await provider.generate(
        ImageGenerationRequest(
            prompt="draw sticker",
            reference_images=(first, second),
            size="1536x1024",
        )
    )

    assert seen_body.count('name="image[]"') == 2
    assert seen_url == "https://direct.shopaikey.com/v1/images/edits"
    assert 'name="model"' in seen_body and "gpt-image-1.5" in seen_body
    assert "1536x1024" in seen_body
    assert 'name="input_fidelity"' in seen_body and "high" in seen_body
    assert 'name="output_format"' in seen_body and "png" in seen_body
    assert 'name="response_format"' in seen_body and "b64_json" in seen_body
    assert seen_headers is not None
    assert seen_headers["authorization"] == "Bearer secret-key"
    assert "secret-key" not in seen_body
    assert result.image_bytes == output
    assert result.provider == "openai"
    assert result.request_id == "openai-request-1"
    assert result.estimated_cost_usd == 0.05


@pytest.mark.asyncio
async def test_openai_provider_uses_singular_image_field_for_one_reference(
    tmp_path: Path,
) -> None:
    source = tmp_path / "source.png"
    _write_image(source)
    seen_body = ""

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal seen_body
        seen_body = request.content.decode("latin1")
        return httpx.Response(
            200,
            json={"data": [{"b64_json": base64.b64encode(b"image").decode("ascii")}]},
        )

    provider = OpenAIImageProvider(
        api_key="secret-key",
        client=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
    )
    await provider.generate(
        ImageGenerationRequest(prompt="test", reference_images=(source,))
    )

    assert seen_body.count('name="image"') == 1
    assert 'name="image[]"' not in seen_body


@pytest.mark.asyncio
async def test_openai_provider_downloads_same_origin_url_result(
    tmp_path: Path,
) -> None:
    source = tmp_path / "source.png"
    _write_image(source)
    requested_urls: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requested_urls.append(str(request.url))
        if request.method == "POST":
            return httpx.Response(
                200,
                json={
                    "data": [
                        {"url": "https://direct.shopaikey.com/v1/results/image.png"}
                    ]
                },
            )
        return httpx.Response(
            200,
            headers={"content-type": "image/png"},
            content=b"downloaded-png",
        )

    provider = OpenAIImageProvider(
        api_key="secret-key",
        base_url="https://direct.shopaikey.com/v1",
        client=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
    )
    result = await provider.generate(
        ImageGenerationRequest(prompt="test", reference_images=(source,))
    )

    assert requested_urls == [
        "https://direct.shopaikey.com/v1/images/edits",
        "https://direct.shopaikey.com/v1/results/image.png",
    ]
    assert result.image_bytes == b"downloaded-png"


@pytest.mark.asyncio
async def test_openai_provider_downloads_allowlisted_cdn_url_result(
    tmp_path: Path,
) -> None:
    source = tmp_path / "source.png"
    _write_image(source)

    def handler(request: httpx.Request) -> httpx.Response:
        if request.method == "POST":
            return httpx.Response(
                200,
                json={"data": [{"url": "https://cdn.shopaikey.com/result.png"}]},
            )
        return httpx.Response(
            200,
            headers={"content-type": "image/png"},
            content=b"cdn-png",
        )

    provider = OpenAIImageProvider(
        api_key="secret-key",
        base_url="https://direct.shopaikey.com/v1",
        trusted_result_domains=("shopaikey.com",),
        client=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
    )
    result = await provider.generate(
        ImageGenerationRequest(prompt="test", reference_images=(source,))
    )

    assert result.image_bytes == b"cdn-png"


@pytest.mark.asyncio
async def test_openai_provider_rejects_cross_origin_url_result(
    tmp_path: Path,
) -> None:
    source = tmp_path / "source.png"
    _write_image(source)
    request_count = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal request_count
        request_count += 1
        return httpx.Response(
            200,
            json={"data": [{"url": "https://attacker.invalid/private.png"}]},
        )

    provider = OpenAIImageProvider(
        api_key="secret-key",
        base_url="https://direct.shopaikey.com/v1",
        client=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
    )
    with pytest.raises(RuntimeError, match="openai_untrusted_image_url"):
        await provider.generate(
            ImageGenerationRequest(prompt="test", reference_images=(source,))
        )

    assert request_count == 1


@pytest.mark.asyncio
async def test_openai_provider_reports_billing_limit(tmp_path: Path) -> None:
    source = tmp_path / "source.png"
    _write_image(source)

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            402,
            json={"error": {"message": "private details"}},
        )

    provider = OpenAIImageProvider(
        api_key="secret-key",
        client=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
    )
    with pytest.raises(RuntimeError, match="openai_quota_or_billing_required"):
        await provider.generate(
            ImageGenerationRequest(prompt="test", reference_images=(source,))
        )


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("payload", "expected_error"),
    [
        ({"error": {"code": "unknown_parameter"}}, "openai_invalid_request"),
        (
            {"error": {"type": "insufficient_quota"}},
            "openai_quota_or_billing_required",
        ),
        (
            {"error": {"code": "organization_spend_limit_exceeded"}},
            "openai_quota_or_billing_required",
        ),
        ({"error": {"code": "rate_limit_exceeded"}}, "openai_rate_limit"),
    ],
)
async def test_openai_provider_classifies_429_errors(
    tmp_path: Path,
    payload: dict[str, object],
    expected_error: str,
) -> None:
    source = tmp_path / "source.png"
    _write_image(source)

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(429, json=payload)

    provider = OpenAIImageProvider(
        api_key="secret-key",
        client=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
    )
    with pytest.raises(RuntimeError, match=expected_error):
        await provider.generate(
            ImageGenerationRequest(prompt="test", reference_images=(source,))
        )


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("status_code", "payload", "expected_error"),
    [
        (400, {"error": {"code": "moderation_blocked"}}, "openai_safety_rejection"),
        (400, {"error": {"code": "invalid_value"}}, "openai_invalid_request"),
        (408, {"error": {"type": "request_timeout"}}, "openai_timeout"),
        (500, {"error": {"type": "server_error"}}, "openai_provider_unavailable"),
        (524, {}, "openai_timeout"),
    ],
)
async def test_openai_provider_classifies_other_http_errors(
    tmp_path: Path,
    status_code: int,
    payload: dict[str, object],
    expected_error: str,
) -> None:
    source = tmp_path / "source.png"
    _write_image(source)

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(status_code, json=payload)

    provider = OpenAIImageProvider(
        api_key="secret-key",
        client=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
    )
    with pytest.raises(RuntimeError, match=expected_error):
        await provider.generate(
            ImageGenerationRequest(prompt="test", reference_images=(source,))
        )
