import json
from collections.abc import Callable
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path

import pytest
from backend.app.core.errors import GenStickerException
from backend.app.db.models.asset import Asset
from backend.app.db.models.character import Character
from backend.app.db.models.job import GenerationJob, JobEvent
from backend.app.db.models.pack import Pack
from backend.app.db.models.user import User
from backend.app.domain.pack_state import create_core_eight_slots, load_pack_slots, save_pack_slots
from backend.app.jobs import runner
from backend.app.providers.base import (
    GenerationArtifact,
    GenerationResult,
    GenerationSpec,
    GenerationStage,
)
from PIL import Image
from sqlalchemy import select

_PNG_BUFFER = BytesIO()
Image.new("RGBA", (2, 2), (99, 102, 241, 255)).save(_PNG_BUFFER, format="PNG")
PNG_BYTES = _PNG_BUFFER.getvalue()


class FakeProvider:
    def __init__(
        self,
        store,
        *,
        artifact_count: int = 1,
        success: bool = True,
        error_code: str | None = None,
        error_message: str | None = None,
        before_return: Callable[[list[GenerationArtifact]], None] | None = None,
        raise_after_callback: Exception | None = None,
    ):
        self.store = store
        self.artifact_count = artifact_count
        self.success = success
        self.error_code = error_code
        self.error_message = error_message
        self.before_return = before_return
        self.raise_after_callback = raise_after_callback
        self.seen_spec: GenerationSpec | None = None
        self.artifacts: list[GenerationArtifact] = []

    async def generate(self, spec, progress_callback=None):
        self.seen_spec = spec
        if progress_callback:
            progress_callback(GenerationStage.GENERATING, 60)

        if self.success:
            for index in range(self.artifact_count):
                stored = self.store.save_bytes(
                    PNG_BYTES,
                    user_id=spec.user_id,
                    extension=".png",
                    asset_subfolder="fake-provider",
                )
                self.artifacts.append(
                    GenerationArtifact(
                        asset_id=f"result-{index + 1}",
                        relative_path=stored.relative_path,
                        mime_type=stored.mime_type,
                        byte_size=stored.byte_size,
                        sha256=stored.sha256,
                        width=stored.width or 1,
                        height=stored.height or 1,
                        variant_name=f"candidate_{index + 1}",
                    )
                )

        if self.before_return:
            self.before_return(self.artifacts)
        if self.raise_after_callback:
            raise self.raise_after_callback

        return GenerationResult(
            success=self.success,
            provider="fake",
            workflow_version="test-v1",
            artifacts=self.artifacts,
            metrics={"gpu_seconds": 0.01},
            error_code=self.error_code,
            error_message=self.error_message,
        )


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _create_user_and_character(db) -> tuple[User, Character]:
    now = _now()
    user = User(
        id="user-1",
        external_id="runner-test-user",
        display_name="Runner Test",
        locale="vi",
        consent_version="1.0",
        consent_accepted=True,
        consent_reuse_opt_in=False,
        consent_accepted_at=now,
        created_at=now,
        updated_at=now,
    )
    character = Character(
        id="character-1",
        user_id=user.id,
        display_name="Runner Character",
        status="DRAFT",
        approved_profile_version=None,
        created_at=now,
        updated_at=now,
    )
    db.add_all([user, character])
    db.commit()
    return user, character


def _create_source_asset(db, store, user: User, character: Character, asset_type: str) -> Asset:
    stored = store.save_bytes(
        PNG_BYTES,
        user_id=user.id,
        extension=".png",
        asset_subfolder="runner-sources",
    )
    asset = Asset(
        id=f"source-{asset_type}",
        user_id=user.id,
        character_id=character.id,
        job_id=None,
        asset_type=asset_type,
        relative_path=stored.relative_path,
        mime_type=stored.mime_type,
        byte_size=stored.byte_size,
        sha256=stored.sha256,
        width=stored.width,
        height=stored.height,
        created_at=_now(),
    )
    db.add(asset)
    db.commit()
    return asset


def _create_job(
    db,
    user: User,
    character: Character,
    *,
    kind: str,
    source_asset_id: str | None,
    pack_id: str | None = None,
    extra_params: dict | None = None,
) -> GenerationJob:
    now = _now()
    job = GenerationJob(
        id=f"job-{kind}",
        user_id=user.id,
        character_id=character.id,
        pack_id=pack_id,
        kind=kind,
        status="queued",
        current_stage="validating",
        progress=0,
        provider="fake",
        request_json=json.dumps(
            {
                "seed": 42,
                "workflow_version": "test-v1",
                "style": "chibi",
                "emotion": "happy",
                "source_asset_id": source_asset_id,
                "extra_params": extra_params or {},
            }
        ),
        created_at=now,
        updated_at=now,
    )
    db.add(job)
    db.commit()
    return job


def _install_fakes(monkeypatch, store, provider: FakeProvider) -> None:
    monkeypatch.setattr(runner, "default_asset_store", store)
    monkeypatch.setattr(runner, "get_generation_provider", lambda: provider)


def test_cut_source_resolution_stays_inside_private_asset_store(
    test_db_session, isolated_external_services, monkeypatch
):
    db = test_db_session
    store = isolated_external_services
    user, character = _create_user_and_character(db)
    source = _create_source_asset(db, store, user, character, "selfie")
    job = _create_job(
        db,
        user,
        character,
        kind="canonical_generation",
        source_asset_id=source.id,
    )
    monkeypatch.setattr(runner, "default_asset_store", store)
    monkeypatch.setattr(runner.settings, "GENERATION_PROVIDER", "cut")

    resolved = runner._resolve_source_uri(db, job, source.id)

    assert resolved == str(store.get_absolute_path(source.relative_path))


def test_cut_source_resolution_materializes_cloud_asset(
    test_db_session, isolated_external_services, monkeypatch, tmp_path
):
    db = test_db_session
    store = isolated_external_services
    user, character = _create_user_and_character(db)
    source = _create_source_asset(db, store, user, character, "selfie")
    job = _create_job(
        db,
        user,
        character,
        kind="canonical_generation",
        source_asset_id=source.id,
    )

    def no_local_path(relative_path: str) -> Path:
        del relative_path
        raise GenStickerException(
            code="storage_read_failed",
            message="Cloud assets do not have a local filesystem path.",
            status_code=500,
        )

    monkeypatch.setattr(store, "get_absolute_path", no_local_path)
    monkeypatch.setattr(runner, "default_asset_store", store)
    monkeypatch.setattr(runner.settings, "GENERATION_PROVIDER", "cut")
    monkeypatch.setattr(runner.settings, "ASSET_ROOT", str(tmp_path / "worker-assets"))

    resolved = Path(runner._resolve_source_uri(db, job, source.id))

    assert resolved.is_file()
    assert resolved.read_bytes() == store.read_bytes(source.relative_path)
    assert resolved.parent.name == "_worker_inputs"


@pytest.mark.asyncio
async def test_canonical_source_job_persists_candidates_and_awaits_approval(
    test_db_session, isolated_external_services, monkeypatch
):
    db = test_db_session
    store = isolated_external_services
    user, character = _create_user_and_character(db)
    source = _create_source_asset(db, store, user, character, "selfie")
    job = _create_job(
        db,
        user,
        character,
        kind="canonical_generation",
        source_asset_id=source.id,
    )
    provider = FakeProvider(store, artifact_count=3)
    _install_fakes(monkeypatch, store, provider)

    assert await runner.process_one_job(db) is True
    db.expire_all()

    completed_job = db.get(GenerationJob, job.id)
    completed_character = db.get(Character, character.id)
    candidate_assets = db.scalars(select(Asset).where(Asset.job_id == job.id)).all()
    event_types = db.scalars(
        select(JobEvent.event_type)
        .where(JobEvent.job_id == job.id)
        .order_by(JobEvent.created_at.asc())
    ).all()
    result = json.loads(completed_job.result_json)

    assert completed_job.status == "succeeded"
    assert completed_job.current_stage == "completed"
    assert completed_job.progress == 100
    assert result["asset_ids"] == ["result-1", "result-2", "result-3"]
    assert [asset.asset_type for asset in candidate_assets] == ["canonical"] * 3
    assert completed_character.status == "AWAITING_APPROVAL"
    assert event_types == ["job_started", "stage_progress", "job_succeeded"]
    assert provider.seen_spec.source_asset_id == source.id
    assert provider.seen_spec.source_uri is None


@pytest.mark.asyncio
async def test_expression_job_completes_its_pack_slot(
    test_db_session, isolated_external_services, monkeypatch
):
    db = test_db_session
    store = isolated_external_services
    user, character = _create_user_and_character(db)
    source = _create_source_asset(db, store, user, character, "canonical")
    slots = create_core_eight_slots()
    target_slot_id = slots[0]["id"]
    pack = Pack(
        id="pack-1",
        user_id=user.id,
        character_id=character.id,
        status="QUEUED",
        config_version=1,
        template_id="core-eight-v1",
        slots_json="[]",
        created_at=_now(),
        updated_at=_now(),
    )
    save_pack_slots(pack, slots)
    db.add(pack)
    db.commit()
    job = _create_job(
        db,
        user,
        character,
        kind="expression_generation",
        source_asset_id=source.id,
        pack_id=pack.id,
        extra_params={"slot_id": target_slot_id},
    )
    provider = FakeProvider(store)
    _install_fakes(monkeypatch, store, provider)

    assert await runner.process_one_job(db) is True
    db.expire_all()

    completed_job = db.get(GenerationJob, job.id)
    updated_pack = db.get(Pack, pack.id)
    target_slot = next(
        slot for slot in load_pack_slots(updated_pack) if slot["id"] == target_slot_id
    )
    result_asset = db.scalar(select(Asset).where(Asset.job_id == job.id))

    assert completed_job.status == "succeeded"
    assert target_slot["status"] == "completed"
    assert target_slot["progress"] == 100
    assert target_slot["selected_asset_id"] == "result-1"
    assert target_slot["candidate_asset_ids"] == ["result-1"]
    assert target_slot["image_uri"] == "/api/v1/assets/result-1/content"
    assert result_asset.asset_type == "sticker"
    assert updated_pack.status == "GENERATING"
    assert provider.seen_spec.pack_id == pack.id


@pytest.mark.asyncio
async def test_provider_failure_leaves_a_stable_terminal_job(
    test_db_session, isolated_external_services, monkeypatch
):
    db = test_db_session
    store = isolated_external_services
    user, character = _create_user_and_character(db)
    job = _create_job(
        db,
        user,
        character,
        kind="canonical_generation",
        source_asset_id=None,
    )
    provider = FakeProvider(
        store,
        success=False,
        error_code="provider_unavailable",
        error_message="Fake provider is offline.",
    )
    _install_fakes(monkeypatch, store, provider)

    assert await runner.process_one_job(db) is True
    db.expire_all()

    failed_job = db.get(GenerationJob, job.id)
    failed_character = db.get(Character, character.id)
    snapshot = (
        failed_job.status,
        failed_job.error_code,
        failed_job.error_message,
        failed_job.completed_at,
    )
    assert snapshot[:3] == (
        "failed",
        "provider_unavailable",
        "Fake provider is offline.",
    )
    assert failed_job.result_json is None
    assert failed_character.status == "DRAFT"
    assert db.scalar(select(Asset).where(Asset.job_id == job.id)) is None

    assert await runner.process_one_job(db) is False
    db.expire_all()
    stable_job = db.get(GenerationJob, job.id)
    assert (
        stable_job.status,
        stable_job.error_code,
        stable_job.error_message,
        stable_job.completed_at,
    ) == snapshot


@pytest.mark.asyncio
async def test_cancelled_job_discards_provider_result_and_resets_parent(
    test_db_session, isolated_external_services, monkeypatch
):
    db = test_db_session
    store = isolated_external_services
    user, character = _create_user_and_character(db)
    job = _create_job(
        db,
        user,
        character,
        kind="canonical_generation",
        source_asset_id=None,
    )

    def cancel_before_return(_artifacts):
        running_job = db.get(GenerationJob, job.id)
        running_job.status = "cancelled"
        running_job.error_code = "job_cancelled"
        running_job.completed_at = _now()
        running_job.updated_at = _now()
        db.commit()

    provider = FakeProvider(store, before_return=cancel_before_return)
    _install_fakes(monkeypatch, store, provider)

    assert await runner.process_one_job(db) is True
    db.expire_all()

    cancelled_job = db.get(GenerationJob, job.id)
    cancelled_character = db.get(Character, character.id)
    assert cancelled_job.status == "cancelled"
    stale_state = []
    if cancelled_character.status != "DRAFT":
        stale_state.append(f"character status is {cancelled_character.status}")
    orphaned = [
        artifact.relative_path
        for artifact in provider.artifacts
        if store.get_absolute_path(artifact.relative_path).exists()
    ]
    if orphaned:
        stale_state.append(f"orphaned provider artifacts: {orphaned}")
    assert not stale_state, "; ".join(stale_state)
    assert db.scalar(select(Asset).where(Asset.job_id == job.id)) is None
    assert provider.artifacts
    assert all(
        not store.get_absolute_path(artifact.relative_path).exists()
        for artifact in provider.artifacts
    )


@pytest.mark.asyncio
async def test_cancelled_job_with_provider_exception_still_resets_parent(
    test_db_session, isolated_external_services, monkeypatch
):
    db = test_db_session
    store = isolated_external_services
    user, character = _create_user_and_character(db)
    job = _create_job(
        db,
        user,
        character,
        kind="canonical_generation",
        source_asset_id=None,
    )

    def cancel_before_raise(_artifacts):
        running_job = db.get(GenerationJob, job.id)
        running_job.status = "cancelled"
        running_job.error_code = "job_cancelled"
        running_job.completed_at = _now()
        running_job.updated_at = _now()
        db.commit()

    provider = FakeProvider(
        store,
        before_return=cancel_before_raise,
        raise_after_callback=RuntimeError("provider stopped after cancellation"),
    )
    _install_fakes(monkeypatch, store, provider)

    assert await runner.process_one_job(db) is True
    db.expire_all()

    cancelled_job = db.get(GenerationJob, job.id)
    cancelled_character = db.get(Character, character.id)
    assert cancelled_job.status == "cancelled"
    assert cancelled_character.status == "DRAFT"
