import json
import time
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.errors import GenStickerException
from backend.app.core.logging import log_event
from backend.app.db.models.asset import Asset
from backend.app.db.models.character import Character
from backend.app.db.models.job import GenerationJob, JobEvent
from backend.app.db.models.pack import Pack
from backend.app.domain.pack_state import apply_job_state_to_pack
from backend.app.observability.cost_ledger import default_budget_policy, default_cost_ledger_service
from backend.app.providers.base import GenerationSpec, GenerationStage
from backend.app.providers.factory import get_generation_provider
from backend.app.storage.asset_store import default_asset_store


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _stage_value(stage: GenerationStage | str) -> str:
    return stage.value if isinstance(stage, GenerationStage) else str(stage)


def _add_job_event(
    db: Session,
    job: GenerationJob,
    event_type: str,
    *,
    payload: dict[str, Any] | None = None,
) -> None:
    db.add(
        JobEvent(
            id=str(uuid.uuid4()),
            job_id=job.id,
            event_type=event_type,
            stage=job.current_stage,
            progress=job.progress,
            payload_json=json.dumps(payload or {}),
            created_at=_now(),
        )
    )


def _load_pack(db: Session, job: GenerationJob) -> Pack | None:
    if not job.pack_id:
        return None
    return db.scalar(
        select(Pack).where(Pack.id == job.pack_id, Pack.user_id == job.user_id)
    )


def _apply_job_to_parent_records(db: Session, job: GenerationJob) -> None:
    pack = _load_pack(db, job)
    if pack is not None:
        apply_job_state_to_pack(pack, job)

    if job.character_id and job.kind == "canonical_generation":
        character = db.scalar(
            select(Character).where(
                Character.id == job.character_id,
                Character.user_id == job.user_id,
            )
        )
        if character is not None and character.approved_profile_version is None:
            if job.status == "running":
                character.status = "GENERATING_CANONICAL"
            elif job.status == "succeeded":
                character.status = "AWAITING_APPROVAL"
            elif job.status in {"failed", "cancelled"}:
                character.status = "DRAFT"
            character.updated_at = _now()


def _resolve_source_uri(
    db: Session,
    job: GenerationJob,
    source_asset_id: str | None,
) -> str | None:
    if not source_asset_id:
        return None

    asset = db.scalar(
        select(Asset).where(
            Asset.id == source_asset_id,
            Asset.user_id == job.user_id,
            Asset.deleted_at.is_(None),
        )
    )
    if asset is None:
        raise GenStickerException(
            code="asset_not_found",
            message="The source asset for this generation job was not found.",
            status_code=404,
        )

    if settings.GENERATION_PROVIDER.lower() == "cut":
        try:
            local_path = default_asset_store.get_absolute_path(asset.relative_path)
            if local_path.is_file():
                return str(local_path)
        except GenStickerException:
            pass

        source_bytes = default_asset_store.read_bytes(asset.relative_path)
        extension = Path(asset.relative_path).suffix or ".img"
        worker_input_dir = settings.asset_root_path / "_worker_inputs"
        worker_input_dir.mkdir(parents=True, exist_ok=True)
        worker_input_path = worker_input_dir / f"{asset.id}{extension}"
        temp_path = worker_input_path.with_suffix(f"{extension}.tmp")
        temp_path.write_bytes(source_bytes)
        temp_path.replace(worker_input_path)
        return str(worker_input_path)

    signed_url = default_asset_store.create_signed_url(asset.relative_path, expires_in=900)
    if signed_url:
        return signed_url

    # Remote providers cannot fetch a private file from the worker filesystem.
    if settings.GENERATION_PROVIDER.lower() == "replicate":
        raise GenStickerException(
            code="provider_not_configured",
            message="Replicate requires cloud asset storage with signed URLs.",
            status_code=503,
        )
    return None


def _provider_model_name(provider: str, has_source_image: bool) -> str:
    if provider == "replicate":
        return "fofr/face-to-sticker" if has_source_image else "fofr/sticker-maker"
    if provider == "comfyui":
        return "comfyui-workflow"
    if provider == "cut":
        return "cut-resnet9-epoch8"
    return "mock-diffusion-v1"


def _delete_uncommitted_artifacts(artifacts: list[Any]) -> None:
    for artifact in artifacts:
        try:
            default_asset_store.delete_asset(artifact.relative_path)
        except Exception:
            # Best effort cleanup; no Asset row has been created at this point.
            pass


async def recover_stale_jobs(db: Session) -> int:
    """Recover jobs stuck in 'running' state longer than STALE_JOB_SECONDS."""
    stale_threshold = _now() - timedelta(seconds=settings.STALE_JOB_SECONDS)
    stmt = (
        select(GenerationJob)
        .where(
            GenerationJob.status == "running",
            GenerationJob.updated_at <= stale_threshold,
        )
        .with_for_update()
    )
    stale_jobs = db.scalars(stmt).all()
    recovered_count = 0

    for job in stale_jobs:
        if job.retry_count < settings.MAX_JOB_RETRIES:
            job.status = "queued"
            job.retry_count += 1
            job.updated_at = _now()
            log_event(
                "WARN",
                f"Requeued stale running job {job.id}",
                user_id=job.user_id,
                job_id=job.id,
            )
        else:
            job.status = "failed"
            job.error_code = "generation_timeout"
            job.error_message = f"Job timed out in running state after {settings.STALE_JOB_SECONDS}s."
            job.completed_at = _now()
            log_event(
                "ERROR",
                f"Stale job {job.id} exceeded retry limit. Marking failed.",
                user_id=job.user_id,
                job_id=job.id,
            )
        _apply_job_to_parent_records(db, job)
        _add_job_event(
            db,
            job,
            "job_recovered" if job.status == "queued" else "job_failed",
            payload={"retry_count": job.retry_count, "error_code": job.error_code},
        )
        recovered_count += 1

    if recovered_count > 0:
        db.commit()
    return recovered_count


async def process_one_job(db: Session) -> bool:
    """Claim and process a single queued job."""
    # First check and recover stale running jobs
    await recover_stale_jobs(db)

    # Claim next queued job
    stmt = (
        select(GenerationJob)
        .where(GenerationJob.status == "queued")
        .order_by(GenerationJob.created_at.asc())
        .with_for_update(skip_locked=True)
        .limit(1)
    )
    job = db.scalars(stmt).first()
    if not job:
        return False

    # Mark as running
    job.status = "running"
    job.started_at = _now()
    job.updated_at = _now()
    _apply_job_to_parent_records(db, job)
    _add_job_event(db, job, "job_started")
    db.commit()

    start_time = time.time()
    user_id = job.user_id
    job_id = job.id

    log_event("INFO", f"Started processing job {job_id}", user_id=user_id, job_id=job_id)

    try:
        # Check budget policy
        default_budget_policy.check_budget(0.0, job.retry_count)

        req_data = json.loads(job.request_json)
        source_asset_id = req_data.get("source_asset_id")
        source_uri = _resolve_source_uri(db, job, source_asset_id)
        spec = GenerationSpec(
            user_id=user_id,
            character_id=job.character_id,
            pack_id=job.pack_id,
            kind=job.kind,
            seed=req_data.get("seed", 42),
            workflow_version=req_data.get("workflow_version", "v1.0"),
            prompt=req_data.get("prompt"),
            style=req_data.get("style", "chibi"),
            emotion=req_data.get("emotion", "happy"),
            source_asset_id=source_asset_id,
            source_uri=source_uri,
            extra_params=req_data.get("extra_params") or {},
        )

        provider = get_generation_provider()

        def on_progress(stage: GenerationStage, progress_pct: int) -> None:
            stage_value = _stage_value(stage)
            job.current_stage = stage_value
            job.progress = max(0, min(100, int(progress_pct)))
            job.updated_at = _now()
            _apply_job_to_parent_records(db, job)
            _add_job_event(
                db,
                job,
                "stage_progress",
                payload={"stage": stage_value, "progress": job.progress},
            )
            db.commit()

        result = await provider.generate(spec, progress_callback=on_progress)
        elapsed_sec = time.time() - start_time

        # The cancel endpoint may have changed this row while the provider was running.
        db.expire(job)
        db.refresh(job)
        if job.status == "cancelled":
            _delete_uncommitted_artifacts(result.artifacts)
            _apply_job_to_parent_records(db, job)
            db.commit()
            log_event(
                "INFO",
                f"Discarded provider result for cancelled job {job_id}",
                user_id=user_id,
                job_id=job_id,
            )
            return True

        if result.success and result.artifacts:
            created_asset_ids = []
            for artifact in result.artifacts:
                asset = Asset(
                    id=artifact.asset_id,
                    user_id=user_id,
                    character_id=job.character_id,
                    job_id=job_id,
                    asset_type="canonical" if job.kind == "canonical_generation" else "sticker",
                    relative_path=artifact.relative_path,
                    mime_type=artifact.mime_type,
                    byte_size=artifact.byte_size,
                    sha256=artifact.sha256,
                    width=artifact.width,
                    height=artifact.height,
                    created_at=_now(),
                )
                db.add(asset)
                created_asset_ids.append(asset.id)

            job.status = "succeeded"
            job.current_stage = "completed"
            job.progress = 100
            job.completed_at = _now()
            job.result_json = json.dumps({
                "candidates": [a.model_dump() for a in result.artifacts],
                "asset_ids": created_asset_ids,
            })
            job.updated_at = _now()
            _apply_job_to_parent_records(db, job)
            _add_job_event(
                db,
                job,
                "job_succeeded",
                payload={"asset_ids": created_asset_ids},
            )
            db.commit()

            # Record cost ledger
            try:
                default_cost_ledger_service.record_cost(
                    db=db,
                    user_id=user_id,
                    job_id=job_id,
                    provider=result.provider,
                    model_name=_provider_model_name(result.provider, bool(source_asset_id)),
                    workflow_version=result.workflow_version,
                    gpu_seconds=float(result.metrics.get("gpu_seconds", round(elapsed_sec, 2))),
                    retry_count=job.retry_count,
                )
            except Exception as cost_exc:
                db.rollback()
                log_event(
                    "WARN",
                    f"Could not record cost for successful job {job_id}: {cost_exc}",
                    user_id=user_id,
                    job_id=job_id,
                )

            log_event(
                "INFO",
                f"Job {job_id} succeeded in {elapsed_sec:.2f}s",
                user_id=user_id,
                job_id=job_id,
                stage="completed",
                duration_ms=round(elapsed_sec * 1000, 2),
            )
        else:
            job.status = "failed"
            job.error_code = result.error_code or "generation_failed"
            job.error_message = result.error_message or "Generation provider failed."
            job.completed_at = _now()
            job.updated_at = _now()
            _apply_job_to_parent_records(db, job)
            _add_job_event(
                db,
                job,
                "job_failed",
                payload={"error_code": job.error_code},
            )
            db.commit()

            log_event(
                "ERROR",
                f"Job {job_id} failed: {job.error_message}",
                user_id=user_id,
                job_id=job_id,
                error_code=job.error_code,
            )

    except Exception as exc:
        elapsed_sec = time.time() - start_time
        db.rollback()
        db.refresh(job)
        if job.status == "cancelled":
            _apply_job_to_parent_records(db, job)
            db.commit()
            log_event(
                "INFO",
                f"Kept cancellation state after provider error for job {job_id}",
                user_id=user_id,
                job_id=job_id,
            )
            return True
        job.status = "failed"
        job.error_code = getattr(exc, "code", "generation_failed")
        job.error_message = getattr(exc, "message", "Generation job failed unexpectedly.")
        job.completed_at = _now()
        job.updated_at = _now()
        _apply_job_to_parent_records(db, job)
        _add_job_event(
            db,
            job,
            "job_failed",
            payload={"error_code": job.error_code},
        )
        db.commit()

        log_event(
            "ERROR",
            f"Exception processing job {job_id}: {exc}",
            user_id=user_id,
            job_id=job_id,
            error_code=job.error_code,
        )

    return True
