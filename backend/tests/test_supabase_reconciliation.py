from __future__ import annotations

import pytest
from postgrest.exceptions import APIError

from app.adapters.supabase import (
    CompletionReconciliation,
    SourceReconciliation,
    SupabaseRepository,
)
from app.config import Settings
from app.mock_pipeline import MockStickerPipeline


class FakeBucket:
    def __init__(self) -> None:
        self.uploaded: list[str] = []
        self.removed: list[list[str]] = []

    def upload(self, path: str, content: bytes, options: dict[str, str]) -> None:
        self.uploaded.append(path)

    def remove(self, paths: list[str]) -> None:
        self.removed.append(list(paths))


class FakeStorage:
    def __init__(self, bucket: FakeBucket) -> None:
        self.bucket = bucket

    def from_(self, name: str) -> FakeBucket:
        return self.bucket


class FailingRpc:
    def __init__(self, error: Exception) -> None:
        self.error = error

    def execute(self):
        raise self.error


class FakeClient:
    def __init__(self, bucket: FakeBucket, rpc_error: Exception) -> None:
        self.storage = FakeStorage(bucket)
        self.rpc_error = rpc_error

    def rpc(self, name: str, payload: dict[str, object]) -> FailingRpc:
        return FailingRpc(self.rpc_error)


def make_repository(bucket: FakeBucket, rpc_error: Exception) -> SupabaseRepository:
    repository = object.__new__(SupabaseRepository)
    repository.settings = Settings(
        data_backend="supabase",
        supabase_url="https://test.supabase.co",
        supabase_service_role_key="test-service-role",
    )
    repository.pipeline = MockStickerPipeline(0)
    repository.client = FakeClient(bucket, rpc_error)
    return repository


def test_completion_commit_then_timeout_preserves_committed_assets(monkeypatch) -> None:
    bucket = FakeBucket()
    repository = make_repository(bucket, TimeoutError("response lost after commit"))

    def committed(**kwargs) -> CompletionReconciliation:
        return CompletionReconciliation(
            committed_set_id=kwargs["candidate_set_id"],
            candidate_committed=True,
        )

    monkeypatch.setattr(repository, "_reconcile_completion", committed)
    set_id = repository._complete_job(owner_id="owner-1", job_id="job-1")

    assert len(bucket.uploaded) == 8
    assert all(f"/{set_id}/" in path for path in bucket.uploaded)
    assert bucket.removed == []


def test_completion_stable_rpc_failure_cleans_candidate_assets(monkeypatch) -> None:
    bucket = FakeBucket()
    rpc_error = APIError(
        {"code": "23514", "message": "rolled back", "details": None, "hint": None}
    )
    repository = make_repository(bucket, rpc_error)
    monkeypatch.setattr(
        repository,
        "_reconcile_completion",
        lambda **kwargs: CompletionReconciliation(candidate_proven_uncommitted=True),
    )

    with pytest.raises(APIError):
        repository._complete_job(owner_id="owner-1", job_id="job-1")

    assert len(bucket.uploaded) == 8
    assert bucket.removed == [bucket.uploaded]


def test_completion_gateway_error_is_ambiguous_and_preserves_assets(monkeypatch) -> None:
    bucket = FakeBucket()
    rpc_error = APIError(
        {"code": "PGRST003", "message": "gateway timeout", "details": None, "hint": None}
    )
    repository = make_repository(bucket, rpc_error)
    monkeypatch.setattr(
        repository,
        "_reconcile_completion",
        lambda **kwargs: CompletionReconciliation(),
    )

    with pytest.raises(APIError):
        repository._complete_job(owner_id="owner-1", job_id="job-1")

    assert bucket.removed == []


def test_source_rpc_commit_then_timeout_preserves_object(monkeypatch) -> None:
    bucket = FakeBucket()
    repository = make_repository(bucket, TimeoutError("response lost after commit"))
    committed_source = {
        "id": "committed-source",
        "status": "ready",
        "validation_results": [],
    }
    monkeypatch.setattr(
        repository,
        "_reconcile_source",
        lambda **kwargs: SourceReconciliation(
            metadata_checked=True,
            metadata_complete=True,
            object_exists=True,
        ),
    )
    monkeypatch.setattr(repository, "get_source", lambda **kwargs: committed_source)

    result = repository.create_source(
        owner_id="owner-1",
        content=b"private-source",
        mime_type="image/png",
        consent_version="demo-v1",
    )

    assert result is committed_source
    assert len(bucket.uploaded) == 1
    assert bucket.removed == []


def test_source_stable_rpc_failure_removes_uncommitted_object(monkeypatch) -> None:
    bucket = FakeBucket()
    rpc_error = APIError(
        {"code": "23505", "message": "rolled back", "details": None, "hint": None}
    )
    repository = make_repository(bucket, rpc_error)
    monkeypatch.setattr(
        repository,
        "_reconcile_source",
        lambda **kwargs: SourceReconciliation(
            metadata_checked=True,
            metadata_complete=False,
            object_exists=True,
        ),
    )
    monkeypatch.setattr(
        repository,
        "_cleanup_source_candidate",
        lambda **kwargs: repository._remove_uploaded_paths(
            bucket=kwargs["bucket"], paths=[kwargs["storage_path"]]
        ),
    )

    with pytest.raises(APIError):
        repository.create_source(
            owner_id="owner-1",
            content=b"private-source",
            mime_type="image/png",
            consent_version="demo-v1",
        )

    assert bucket.removed == [bucket.uploaded]


def test_source_gateway_error_is_ambiguous_and_preserves_object(monkeypatch) -> None:
    bucket = FakeBucket()
    rpc_error = APIError(
        {"code": "PGRST003", "message": "gateway timeout", "details": None, "hint": None}
    )
    repository = make_repository(bucket, rpc_error)
    monkeypatch.setattr(
        repository,
        "_reconcile_source",
        lambda **kwargs: SourceReconciliation(
            metadata_checked=True,
            metadata_complete=False,
            object_exists=True,
        ),
    )

    with pytest.raises(APIError):
        repository.create_source(
            owner_id="owner-1",
            content=b"private-source",
            mime_type="image/png",
            consent_version="demo-v1",
        )

    assert bucket.removed == []
