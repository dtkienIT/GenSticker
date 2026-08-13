from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path
from types import SimpleNamespace

import jwt
import pytest
from postgrest.exceptions import APIError

from app.config import Settings
from app.domain import JobStatus
from app.errors import AppError
from app.mock_pipeline import MockStickerPipeline
from app.security import Authenticator


def test_mock_pipeline_state_machine() -> None:
    pipeline = MockStickerPipeline(stage_seconds=10)
    started = datetime.now(UTC)
    created_at = started.isoformat()
    queued = pipeline.snapshot(created_at=created_at, scenario="success", now=started)
    assert queued.status is JobStatus.QUEUED
    assert pipeline.snapshot(
        created_at=created_at,
        scenario="success",
        now=started + timedelta(seconds=15),
    ).status is JobStatus.GENERATING
    assert pipeline.snapshot(
        created_at=created_at,
        scenario="success",
        now=started + timedelta(seconds=25),
    ).status is JobStatus.MODERATING
    assert pipeline.snapshot(
        created_at=created_at,
        scenario="success",
        now=started + timedelta(seconds=35),
    ).status is JobStatus.SUCCEEDED


def test_mock_svg_contains_no_source_data() -> None:
    pipeline = MockStickerPipeline(stage_seconds=0)
    content = pipeline.render_placeholder(ordinal=8, job_id="private-source-never-used")
    assert content.startswith(b"<svg")
    assert b"MOCK 8" in content
    assert b"private-source-never-used" not in content


def test_supabase_hs256_bearer_is_verified() -> None:
    user_id = str(uuid.uuid4())
    issuer = "https://project.supabase.co/auth/v1"
    token = jwt.encode(
        {
            "sub": user_id,
            "aud": "authenticated",
            "iss": issuer,
            "exp": datetime.now(UTC) + timedelta(minutes=5),
        },
        "test-jwt-secret-with-at-least-32-bytes",
        algorithm="HS256",
    )
    settings = Settings(
        data_backend="supabase",
        supabase_url="https://project.supabase.co",
        supabase_service_role_key="test-service-role-value",
        supabase_jwt_secret="test-jwt-secret-with-at-least-32-bytes",
    )
    request = SimpleNamespace(headers={"Authorization": f"Bearer {token}"})
    principal = Authenticator(settings)._authenticate_bearer(request)  # type: ignore[arg-type]
    assert principal.owner_id == user_id
    assert principal.auth_mode == "supabase"


def test_invalid_bearer_is_rejected() -> None:
    settings = Settings(
        data_backend="supabase",
        supabase_url="https://project.supabase.co",
        supabase_service_role_key="test-service-role-value",
        supabase_jwt_secret="test-jwt-secret-with-at-least-32-bytes",
    )
    request = SimpleNamespace(headers={"Authorization": "Bearer invalid"})
    with pytest.raises(AppError) as exc_info:
        Authenticator(settings)._authenticate_bearer(request)  # type: ignore[arg-type]
    assert exc_info.value.status_code == 401


def test_production_refuses_mock_pipeline() -> None:
    from app.main import create_app

    settings = Settings(app_env="production", pipeline_backend="mock")
    with pytest.raises(RuntimeError, match="Refusing to start production"):
        create_app(settings)


@pytest.mark.parametrize(
    ("provider_code", "http_status", "app_code"),
    [
        ("P0002", 404, "NOT_FOUND"),
        ("23514", 400, "INVALID_STICKER_SELECTION"),
        ("23505", 409, "IDEMPOTENCY_KEY_REUSED"),
    ],
)
def test_supabase_save_rpc_errors_are_safely_mapped(
    provider_code: str,
    http_status: int,
    app_code: str,
) -> None:
    from app.adapters.supabase import SupabaseRepository

    provider_error = APIError(
        {
            "code": provider_code,
            "message": "sensitive database detail /private/storage/path",
            "details": "do not expose",
            "hint": None,
        }
    )
    with pytest.raises(AppError) as exc_info:
        SupabaseRepository._raise_save_rpc_error(provider_error)
    assert exc_info.value.status_code == http_status
    assert exc_info.value.code == app_code
    assert "sensitive" not in exc_info.value.detail


def test_supabase_migration_is_api_only() -> None:
    migration_path = Path(__file__).parents[2] / "supabase/migrations/001_mvp.sql"
    sql = migration_path.read_text(encoding="utf-8").lower()
    assert "create policy" not in sql
    assert "from public, anon, authenticated" in sql
    assert "to service_role" in sql
    assert "values ('source-images', 'source-images', false)" in sql
    assert "values ('generated-stickers', 'generated-stickers', false)" in sql
    assert "create or replace function public.create_mock_source" in sql
    assert "pg_advisory_xact_lock" in sql
    assert "requires 6-8 passed variants" in sql
    assert "cannot contain blocked variants" in sql
    assert "sticker_sets_protect_succeeded" in sql
    assert "cannot change job, owner or status" in sql
    assert "requires an isolated project with no storage.objects policies" in sql


def test_supabase_readiness_checks_product_contract_columns() -> None:
    from app.adapters.supabase import SupabaseRepository

    selected: list[tuple[str, str]] = []

    class Query:
        def __init__(self, table: str) -> None:
            self.table = table

        def select(self, columns: str) -> Query:
            selected.append((self.table, columns))
            return self

        def limit(self, _count: int) -> Query:
            return self

        def execute(self) -> SimpleNamespace:
            return SimpleNamespace(data=[])

    class Client:
        def table(self, name: str) -> Query:
            return Query(name)

    repository = object.__new__(SupabaseRepository)
    repository.client = Client()

    assert repository.ready() is True
    assert selected == [
        ("source_images", "id,subject_type,expires_at"),
        ("generation_jobs", "id,style_id,locale,catalog_version"),
        (
            "sticker_sets",
            "id,target_count,published_count,rejected_count,subject_type,locale,catalog_version",
        ),
    ]


def test_upgrade_migration_supports_existing_kien_v6_database() -> None:
    migration_path = Path(__file__).parents[2] / "supabase/migrations/002_product_contract.sql"
    sql = migration_path.read_text(encoding="utf-8").lower()

    assert "add column if not exists subject_type" in sql
    assert "add column if not exists style_id" in sql
    assert "add column if not exists published_count" in sql
    assert "existing sticker sets do not satisfy the 6-8 output contract" in sql
    assert "create or replace function public.complete_mock_generation" in sql
    assert "create constraint trigger generation_jobs_publishable" in sql
    assert "from public, anon, authenticated" in sql
    assert "to service_role" in sql
