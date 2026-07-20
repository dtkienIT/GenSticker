import json
import time
import uuid
from datetime import datetime, timedelta, timezone

from backend.app.core.config import settings
from backend.app.core.logging import log_event
from backend.app.db.models.asset import Asset
from backend.app.db.models.job import GenerationJob, JobEvent
from backend.app.observability.cost_ledger import default_budget_policy, default_cost_ledger_service
from backend.app.providers.base import GenerationSpec
from backend.app.providers.mock_provider import MockGenerationProvider
from sqlalchemy import select
from sqlalchemy.orm import Session


async def recover_stale_jobs(db: Session) -> int:
    """Recover jobs stuck in 'running' state longer than STALE_JOB_SECONDS."""
    stale_threshold = datetime.now(timezone.utc) - timedelta(seconds=settings.STALE_JOB_SECONDS)
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
            job.updated_at = datetime.now(timezone.utc)
            log_event(
                "WARN",
                f"Requeued stale running job {job.id}",
                user_id=job.user_id,
                job_id=job.id,
            )
        else:
            job.status = "failed"
            job.error_code = "stale_job_timeout"
            job.error_message = f"Job timed out in running state after {settings.STALE_JOB_SECONDS}s."
            job.completed_at = datetime.now(timezone.utc)
            log_event(
                "ERROR",
                f"Stale job {job.id} exceeded retry limit. Marking failed.",
                user_id=job.user_id,
                job_id=job.id,
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
        .limit(1)
    )
    job = db.scalars(stmt).first()
    if not job:
        return False

    # Mark as running
    job.status = "running"
    job.started_at = datetime.now(timezone.utc)
    job.updated_at = datetime.now(timezone.utc)
    db.commit()

    start_time = time.time()
    user_id = job.user_id
    job_id = job.id

    log_event("INFO", f"Started processing job {job_id}", user_id=user_id, job_id=job_id)

    try:
        # Check budget policy
        default_budget_policy.check_budget(0.0, job.retry_count)

        req_data = json.loads(job.request_json)
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
            source_asset_id=req_data.get("source_asset_id"),
        )

        provider = MockGenerationProvider()

        def on_progress(stage: str, progress_pct: int) -> None:
            job.current_stage = stage
            job.progress = progress_pct
            job.updated_at = datetime.now(timezone.utc)

            event = JobEvent(
                id=str(uuid.uuid4()),
                job_id=job_id,
                event_type="stage_progress",
                stage=stage,
                progress=progress_pct,
                payload_json=json.dumps({"stage": stage, "progress": progress_pct}),
                created_at=datetime.now(timezone.utc),
            )
            db.add(event)
            db.commit()

        result = await provider.generate(spec, progress_callback=on_progress)
        elapsed_sec = time.time() - start_time

        if result.success:
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
                    created_at=datetime.now(timezone.utc),
                )
                db.add(asset)
                created_asset_ids.append(asset.id)

            job.status = "succeeded"
            job.current_stage = "completed"
            job.progress = 100
            job.completed_at = datetime.now(timezone.utc)
            job.result_json = json.dumps({
                "candidates": [a.model_dump() for a in result.artifacts],
                "asset_ids": created_asset_ids,
            })
            job.updated_at = datetime.now(timezone.utc)
            db.commit()

            # Record cost ledger
            default_cost_ledger_service.record_cost(
                db=db,
                user_id=user_id,
                job_id=job_id,
                provider=result.provider,
                model_name="mock-diffusion-v1",
                workflow_version=result.workflow_version,
                gpu_seconds=round(elapsed_sec, 2),
                retry_count=job.retry_count,
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
            job.completed_at = datetime.now(timezone.utc)
            job.updated_at = datetime.now(timezone.utc)
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
        job.status = "failed"
        job.error_code = getattr(exc, "code", "job_execution_error")
        job.error_message = str(exc)
        job.completed_at = datetime.now(timezone.utc)
        job.updated_at = datetime.now(timezone.utc)
        db.commit()

        log_event(
            "ERROR",
            f"Exception processing job {job_id}: {exc}",
            user_id=user_id,
            job_id=job_id,
            error_code=job.error_code,
        )

    return True
