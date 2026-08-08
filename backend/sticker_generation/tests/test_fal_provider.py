import json
from pathlib import Path
from typing import Any

import httpx
import pytest
from PIL import Image

from sticker_generation.models import ImageGenerationRequest
from sticker_generation.providers.fal_queue import FalQueueImageProvider


def _write_image(path: Path) -> None:
    Image.new("RGB", (32, 32), "white").save(path)


@pytest.mark.asyncio
async def test_fal_provider_submits_data_uris_and_polls_without_leaking_key(tmp_path: Path) -> None:
    source = tmp_path / "source.png"
    _write_image(source)
    seen_headers: list[httpx.Headers] = []
    seen_payloads: list[dict[str, Any]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        seen_headers.append(request.headers)
        if request.method == "POST":
            seen_payloads.append(json.loads(request.content))
            return httpx.Response(
                200,
                json={
                    "request_id": "req-1",
                    "status_url": "https://queue.fal.run/status/req-1",
                    "response_url": "https://queue.fal.run/result/req-1",
                },
            )
        if request.url.path.startswith("/status"):
            return httpx.Response(200, json={"status": "COMPLETED"})
        return httpx.Response(
            200,
            json={"images": [{"url": "https://cdn.example/result.png"}]},
        )

    provider = FalQueueImageProvider(
        api_key="secret-key",
        model_id="fal-ai/example/edit",
        client=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
        poll_interval_seconds=0,
        allowed_hosts=("queue.fal.run", "cdn.example"),
    )
    result = await provider.generate(
        ImageGenerationRequest(prompt="test", reference_images=(source,))
    )

    assert result.image_url == "https://cdn.example/result.png"
    assert seen_payloads[0]["image_urls"][0].startswith("data:image/png;base64,")
    assert seen_headers[0]["authorization"] == "Key secret-key"
    assert "secret-key" not in str(seen_payloads)


@pytest.mark.asyncio
async def test_fal_provider_rejects_oversized_reference_before_network(tmp_path: Path) -> None:
    source = tmp_path / "large.png"
    source.write_bytes(b"x" * 11)
    provider = FalQueueImageProvider(
        api_key="secret-key",
        model_id="fal-ai/example/edit",
        max_reference_bytes=10,
    )

    with pytest.raises(ValueError, match="reference_image_too_large"):
        await provider.generate(
            ImageGenerationRequest(prompt="test", reference_images=(source,))
        )


@pytest.mark.asyncio
async def test_fal_provider_rejects_untrusted_result_host(tmp_path: Path) -> None:
    source = tmp_path / "source.png"
    _write_image(source)

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={"images": [{"url": "https://169.254.169.254/metadata"}]},
        )

    provider = FalQueueImageProvider(
        api_key="secret-key",
        model_id="fal-ai/example/edit",
        client=httpx.AsyncClient(transport=httpx.MockTransport(handler)),
        poll_interval_seconds=0,
    )
    with pytest.raises(ValueError, match="provider_url_host_not_allowed"):
        await provider.generate(
            ImageGenerationRequest(prompt="test", reference_images=(source,))
        )
