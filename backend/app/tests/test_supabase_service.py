from __future__ import annotations

import pytest

from app.services import supabase_service as supabase_module
from app.services.supabase_service import SupabaseService


class _FakeBucket:
    def __init__(self, failures_before_success: int) -> None:
        self.failures_before_success = failures_before_success
        self.upload_paths: list[str] = []

    def upload(self, *, path: str, file: bytes, file_options: dict[str, str]) -> None:
        del file, file_options
        self.upload_paths.append(path)
        if len(self.upload_paths) <= self.failures_before_success:
            raise RuntimeError("Server disconnected")

    def get_public_url(self, path: str) -> str:
        return f"https://storage.test/{path}"


class _FakeStorage:
    def __init__(self, bucket: _FakeBucket) -> None:
        self.bucket = bucket

    def from_(self, _bucket_name: str) -> _FakeBucket:
        return self.bucket


class _FakeClient:
    def __init__(self, bucket: _FakeBucket) -> None:
        self.storage = _FakeStorage(bucket)


@pytest.fixture(autouse=True)
def _no_retry_wait(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(supabase_module.time, "sleep", lambda _seconds: None)


def _install_client(monkeypatch: pytest.MonkeyPatch, bucket: _FakeBucket) -> None:
    monkeypatch.setattr(supabase_module, "supabase_admin", _FakeClient(bucket))
    monkeypatch.setattr(supabase_module, "supabase", None)


def test_storage_upload_retries_transient_disconnect_with_same_path(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    bucket = _FakeBucket(failures_before_success=2)
    _install_client(monkeypatch, bucket)

    public_url = SupabaseService.upload_image_to_storage(
        b"png-data",
        "job-1_sticker-19.png",
        "image/png",
    )

    assert public_url.startswith("https://storage.test/uploads/")
    assert len(bucket.upload_paths) == 3
    assert len(set(bucket.upload_paths)) == 1


def test_storage_upload_falls_back_only_after_all_attempts_fail(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    bucket = _FakeBucket(failures_before_success=99)
    _install_client(monkeypatch, bucket)

    public_url = SupabaseService.upload_image_to_storage(
        b"png-data",
        "job-1_sticker-20.png",
        "image/png",
    )

    assert len(bucket.upload_paths) == supabase_module.STORAGE_UPLOAD_MAX_ATTEMPTS
    assert public_url.startswith("https://api.dicebear.com/")
