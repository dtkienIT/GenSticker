import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.errors import ResourceNotFoundException, TenantAccessDeniedException
from backend.app.core.security import get_current_user
from backend.app.db.models.job import GenerationJob, JobEvent
from backend.app.db.models.user import User
from backend.app.db.session import get_db

router = APIRouter()


class CreateJobRequest(BaseModel):
    character_id: Optional[str] = None
    pack_id: Optional[str] = None
    kind: str = "canonical_generation"  # canonical_generation | expression_generation | pack_generation
    seed: int = 42
    workflow_version: str = "v1.0"
    prompt: Optional[str] = None
    style: str = "chibi"
    emotion: str = "happy"
    source_asset_id: Optional[str] = None
    extra_params: Dict[str, Any] = Field(default_factory=dict)


@router.post("/generation-jobs")
def create_generation_job(
    payload: CreateJobRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    request_payload = {
        "seed": payload.seed,
        "workflow_version": payload.workflow_version,
        "prompt": payload.prompt,
        "style": payload.style,
        "emotion": payload.emotion,
        "source_asset_id": payload.source_asset_id,
        "extra_params": payload.extra_params,
    }

    job = GenerationJob(
        id=job_id,
        user_id=current_user.id,
        character_id=payload.character_id,
        pack_id=payload.pack_id,
        kind=payload.kind,
        status="queued",
        current_stage="validating",
        progress=0,
        provider=settings.GENERATION_PROVIDER,
        request_json=json.dumps(request_payload),
        created_at=now,
        updated_at=now,
    )
    db.add(job)

    # Initial event
    event = JobEvent(
        id=str(uuid.uuid4()),
        job_id=job_id,
        event_type="job_queued",
        stage="validating",
        progress=0,
        payload_json=json.dumps({"message": "Job queued for local execution"}),
        created_at=now,
    )
    db.add(event)

    db.commit()
    db.refresh(job)

    return {
        "id": job.id,
        "user_id": job.user_id,
        "character_id": job.character_id,
        "kind": job.kind,
        "status": job.status,
        "current_stage": job.current_stage,
        "progress": job.progress,
        "provider": job.provider,
        "created_at": job.created_at.isoformat(),
        "updated_at": job.updated_at.isoformat(),
    }


@router.get("/generation-jobs")
def list_generation_jobs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    jobs = (
        db.query(GenerationJob)
        .filter(GenerationJob.user_id == current_user.id)
        .order_by(GenerationJob.created_at.desc())
        .all()
    )

    return [
        {
            "id": j.id,
            "character_id": j.character_id,
            "kind": j.kind,
            "status": j.status,
            "current_stage": j.current_stage,
            "progress": j.progress,
            "provider": j.provider,
            "error_code": j.error_code,
            "error_message": j.error_message,
            "created_at": j.created_at.isoformat(),
            "updated_at": j.updated_at.isoformat(),
        }
        for j in jobs
    ]


@router.get("/generation-jobs/{job_id}")
def get_generation_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = db.query(GenerationJob).filter(GenerationJob.id == job_id).first()
    if not job:
        raise ResourceNotFoundException(resource_type="GenerationJob", resource_id=job_id)
    if job.user_id != current_user.id:
        raise TenantAccessDeniedException()

    result_data = json.loads(job.result_json) if job.result_json else None

    return {
        "id": job.id,
        "user_id": job.user_id,
        "character_id": job.character_id,
        "pack_id": job.pack_id,
        "kind": job.kind,
        "status": job.status,
        "current_stage": job.current_stage,
        "progress": job.progress,
        "provider": job.provider,
        "result": result_data,
        "error_code": job.error_code,
        "error_message": job.error_message,
        "retry_count": job.retry_count,
        "created_at": job.created_at.isoformat(),
        "started_at": job.started_at.isoformat() if job.started_at else None,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        "updated_at": job.updated_at.isoformat(),
    }


@router.get("/generation-jobs/{job_id}/events")
def get_job_events(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = db.query(GenerationJob).filter(GenerationJob.id == job_id).first()
    if not job:
        raise ResourceNotFoundException(resource_type="GenerationJob", resource_id=job_id)
    if job.user_id != current_user.id:
        raise TenantAccessDeniedException()

    events = (
        db.query(JobEvent)
        .filter(JobEvent.job_id == job_id)
        .order_by(JobEvent.created_at.asc())
        .all()
    )

    return [
        {
            "id": e.id,
            "job_id": e.job_id,
            "event_type": e.event_type,
            "stage": e.stage,
            "progress": e.progress,
            "payload": json.loads(e.payload_json),
            "created_at": e.created_at.isoformat(),
        }
        for e in events
    ]


@router.post("/generation-jobs/{job_id}/cancel")
def cancel_generation_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = db.query(GenerationJob).filter(GenerationJob.id == job_id).first()
    if not job:
        raise ResourceNotFoundException(resource_type="GenerationJob", resource_id=job_id)
    if job.user_id != current_user.id:
        raise TenantAccessDeniedException()

    if job.status in ["succeeded", "failed", "cancelled"]:
        return {"id": job.id, "status": job.status, "message": "Job is already finished."}

    now = datetime.now(timezone.utc)
    job.status = "cancelled"
    job.completed_at = now
    job.updated_at = now

    event = JobEvent(
        id=str(uuid.uuid4()),
        job_id=job_id,
        event_type="job_cancelled",
        stage=job.current_stage,
        progress=job.progress,
        payload_json=json.dumps({"message": "Job cancelled by user"}),
        created_at=now,
    )
    db.add(event)
    db.commit()

    return {"id": job.id, "status": "cancelled", "message": "Job successfully cancelled."}
