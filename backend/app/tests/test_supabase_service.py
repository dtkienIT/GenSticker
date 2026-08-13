from __future__ import annotations

import httpx
import pytest

from app.config import settings
from app.services import supabase_service as supabase_module
from app.services.supabase_service import SupabaseService


@pytest.fixture(autouse=True)
def _configured_storage(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "SUPABASE_URL", "https://storage.test")
    monkeypatch.setattr(settings, "SUPABASE_SERVICE_ROLE_KEY", "service-role-test")
    monkeypatch.setattr(settings, "SUPABASE_ANON_KEY", "")
    monkeypatch.setattr(settings, "SUPABASE_STORAGE_BUCKET", "stickers")
    monkeypatch.setattr(supabase_module.time, "sleep", lambda _seconds: None)


def _install_http_client(
    monkeypatch: pytest.MonkeyPatch,
    *,
    failures_before_success: int,
) -> dict[str, list]:
    state: dict[str, list] = {
        "client_options": [],
        "post_urls": [],
        "delete_payloads": [],
    }

    class FakeClient:
        def __init__(self, **options: object) -> None:
            state["client_options"].append(options)

        def __enter__(self):  # type: ignore[no-untyped-def]
            return self

        def __exit__(self, *_args: object) -> None:
            return None

        def post(
            self,
            url: str,
            *,
            headers: dict[str, str],
            content: bytes,
        ) -> httpx.Response:
            del headers, content
            state["post_urls"].append(url)
            request = httpx.Request("POST", url)
            if len(state["post_urls"]) <= failures_before_success:
                raise httpx.ReadError("Server disconnected", request=request)
            return httpx.Response(200, request=request)

        def delete(
            self,
            url: str,
            *,
            headers: dict[str, str],
            json: dict[str, list[str]],
        ) -> httpx.Response:
            del headers
            state["delete_payloads"].append(json)
            return httpx.Response(200, request=httpx.Request("DELETE", url))

    monkeypatch.setattr(supabase_module.httpx, "Client", FakeClient)
    return state


def test_storage_upload_retries_with_a_fresh_http1_client_and_same_path(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    state = _install_http_client(monkeypatch, failures_before_success=2)

    public_url = SupabaseService.upload_image_to_storage(
        b"png-data",
        "job-1_sticker-19.png",
        "image/png",
    )

    assert public_url.startswith(
        "https://storage.test/storage/v1/object/public/stickers/uploads/"
    )
    assert len(state["post_urls"]) == 3
    assert len(set(state["post_urls"])) == 1
    assert len(state["client_options"]) == 3
    assert all(options["http2"] is False for options in state["client_options"])


def test_storage_upload_falls_back_only_after_all_isolated_attempts_fail(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    state = _install_http_client(monkeypatch, failures_before_success=99)

    public_url = SupabaseService.upload_image_to_storage(
        b"png-data",
        "job-1_sticker-20.png",
        "image/png",
    )

    assert len(state["post_urls"]) == supabase_module.STORAGE_UPLOAD_MAX_ATTEMPTS
    assert public_url.startswith("https://api.dicebear.com/")


def test_partial_upload_cleanup_uses_object_paths_from_public_urls(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    state = _install_http_client(monkeypatch, failures_before_success=0)
    public_urls = [
        "https://storage.test/storage/v1/object/public/stickers/uploads/one.png",
        "https://storage.test/storage/v1/object/public/stickers/uploads/two.png",
    ]

    SupabaseService.delete_storage_urls(public_urls)

    assert state["delete_payloads"] == [
        {"prefixes": ["uploads/one.png", "uploads/two.png"]}
    ]
