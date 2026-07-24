import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Literal, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.core.errors import (
    GenStickerException,
    ResourceNotFoundException,
    TenantAccessDeniedException,
)
from backend.app.core.security import get_current_user
from backend.app.db.models.asset import Asset
from backend.app.db.models.character import Character, CharacterProfile
from backend.app.db.models.job import GenerationJob, JobEvent
from backend.app.db.models.pack import Pack
from backend.app.db.models.user import User
from backend.app.db.session import get_db

router = APIRouter()


class CreateJobRequest(BaseModel):
    character_id: Optional[str] = None
    pack_id: Optional[str] = None
    kind: Literal[
        "canonical_generation", "expression_generation", "pack_generation", "selfie_to_sticker"
    ] = "canonical_generation"
    seed: int = 42
    workflow_version: str = "v1.0"
    prompt: Optional[str] = None
    style: str = "chibi"
    emotion: str = "happy"
    source_asset_id: Optional[str] = None
    extra_params: Dict[str, Any] = Field(default_factory=dict)


def _parse_result(job: GenerationJob) -> dict[str, Any] | None:
    if not job.result_json:
        return None
    try:
        result = json.loads(job.result_json)
    except (TypeError, ValueError, json.JSONDecodeError):
        return None
    return result if isinstance(result, dict) else None


def _candidate_asset_ids(result: dict[str, Any] | None) -> list[str]:
    if not result:
        return []
    candidates = result.get("candidates", [])
    if not isinstance(candidates, list):
        return []
    values: list[str] = []
    for candidate in candidates:
        if not isinstance(candidate, dict):
            continue
        asset_id = candidate.get("asset_id") or candidate.get("id")
        if isinstance(asset_id, str) and asset_id:
            values.append(asset_id)
    return values


def _serialize_job(job: GenerationJob, message: str | None = None) -> dict[str, Any]:
    result = _parse_result(job)
    response = {
        "id": job.id,
        "user_id": job.user_id,
        "character_id": job.character_id,
        "pack_id": job.pack_id,
        "kind": job.kind,
        "status": job.status,
        "current_stage": job.current_stage,
        "progress": job.progress,
        "provider": job.provider,
        "result": result,
        "candidate_asset_ids": _candidate_asset_ids(result),
        "error_code": job.error_code,
        "error_message": job.error_message,
        "retry_count": job.retry_count,
        "created_at": job.created_at.isoformat(),
        "started_at": job.started_at.isoformat() if job.started_at else None,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        "updated_at": job.updated_at.isoformat(),
    }
    if message:
        response["message"] = message
    return response


def _sync_character_lifecycle(db: Session, job: GenerationJob) -> bool:
    if job.kind != "canonical_generation" or not job.character_id:
        return False
    character = db.query(Character).filter(Character.id == job.character_id).first()
    if (
        not character
        or character.deleted_at is not None
        or character.approved_profile_version is not None
    ):
        return False

    next_status = character.status
    if job.status in {"queued", "running"}:
        next_status = "GENERATING_CANONICAL"
    elif job.status == "succeeded":
        next_status = "AWAITING_APPROVAL"
    if next_status == character.status:
        return False
    character.status = next_status
    character.updated_at = datetime.now(timezone.utc)
    return True


def _profile_style(profile: CharacterProfile) -> str:
    try:
        config = json.loads(profile.config_json or "{}")
    except (TypeError, ValueError, json.JSONDecodeError):
        return "chibi"
    style = config.get("style") if isinstance(config, dict) else None
    return style if isinstance(style, str) and style else "chibi"


def _validate_job_references(
    db: Session, payload: CreateJobRequest, current_user: User
) -> tuple[Character | None, Pack | None, Asset | None, CharacterProfile | None]:
    character: Character | None = None
    pack: Pack | None = None
    source_asset: Asset | None = None
    profile: CharacterProfile | None = None

    if payload.character_id:
        character = (
            db.query(Character)
            .filter(Character.id == payload.character_id, Character.deleted_at.is_(None))
            .first()
        )
        if not character:
            raise ResourceNotFoundException(
                resource_type="Character", resource_id=payload.character_id
            )
        if character.user_id != current_user.id:
            raise TenantAccessDeniedException()

    if payload.pack_id:
        pack = db.query(Pack).filter(Pack.id == payload.pack_id).first()
        if not pack:
            raise ResourceNotFoundException(
                resource_type="StickerPack", resource_id=payload.pack_id
            )
        if pack.user_id != current_user.id:
            raise TenantAccessDeniedException()
        if character is None:
            character = (
                db.query(Character)
                .filter(Character.id == pack.character_id, Character.deleted_at.is_(None))
                .first()
            )
            if character is None:
                raise ResourceNotFoundException(
                    resource_type="Character", resource_id=pack.character_id
                )
        if character and pack.character_id != character.id:
            raise GenStickerException(
                code="invalid_job_request",
                message="The sticker pack does not belong to the requested character.",
                status_code=422,
            )

        profile = (
            db.query(CharacterProfile)
            .filter(
                CharacterProfile.character_id == pack.character_id,
                CharacterProfile.version == pack.config_version,
            )
            .first()
        )

    source_asset_id = payload.source_asset_id
    if not source_asset_id and character and payload.kind == "canonical_generation":
        selfie = (
            db.query(Asset)
            .filter(
                Asset.user_id == current_user.id,
                Asset.character_id == character.id,
                Asset.asset_type == "selfie",
                Asset.deleted_at.is_(None),
            )
            .order_by(Asset.created_at.desc())
            .first()
        )
        source_asset_id = selfie.id if selfie else None

    if not source_asset_id and payload.kind == "expression_generation":
        if profile is None and character is not None:
            profile = (
                db.query(CharacterProfile)
                .filter(CharacterProfile.character_id == character.id)
                .order_by(CharacterProfile.version.desc())
                .first()
            )
        source_asset_id = profile.canonical_asset_id if profile else None

    if source_asset_id:
        source_asset = (
            db.query(Asset).filter(Asset.id == source_asset_id, Asset.deleted_at.is_(None)).first()
        )
        if not source_asset:
            raise ResourceNotFoundException(resource_type="Asset", resource_id=source_asset_id)
        if source_asset.user_id != current_user.id:
            raise TenantAccessDeniedException()
        if character and source_asset.character_id not in {None, character.id}:
            raise GenStickerException(
                code="invalid_job_request",
                message="The source asset does not belong to the requested character.",
                status_code=422,
            )
        if payload.kind == "canonical_generation" and source_asset.asset_type != "selfie":
            raise GenStickerException(
                code="invalid_job_request",
                message="Canonical generation requires a selfie source asset.",
                status_code=422,
            )
        if payload.kind == "expression_generation" and source_asset.asset_type != "canonical":
            raise GenStickerException(
                code="invalid_job_request",
                message="Expression generation requires a canonical source asset.",
                status_code=422,
            )

    if payload.kind == "canonical_generation" and character is None:
        raise GenStickerException(
            code="invalid_job_request",
            message="Canonical generation requires a character_id.",
            status_code=422,
        )
    if payload.kind == "canonical_generation" and source_asset is None:
        raise GenStickerException(
            code="asset_not_found",
            message="Canonical generation requires a selfie asset linked to the character.",
            status_code=422,
        )
    if payload.kind == "expression_generation" and source_asset is None:
        raise GenStickerException(
            code="character_not_approved",
            message="Expression generation requires an approved canonical profile.",
            status_code=409,
        )
    return character, pack, source_asset, profile


@router.post("/generation-jobs")
def create_generation_job(
    payload: CreateJobRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    if payload.kind == "canonical_generation" and (
        not current_user.consent_accepted or current_user.consent_version != "1.0"
    ):
        raise GenStickerException(
            code="consent_required",
            message="Version 1.0 image-processing consent is required before canonical generation.",
            status_code=403,
        )
    character, _, source_asset, profile = _validate_job_references(db, payload, current_user)
    job_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    job = GenerationJob(
        id=job_id,
        user_id=current_user.id,
        character_id=character.id if character else None,
        pack_id=payload.pack_id,
        kind=payload.kind,
        status="queued",
        current_stage="validating",
        progress=0,
        provider="universal",
        request_json=json.dumps(
            {
                "seed": payload.seed,
                "workflow_version": payload.workflow_version,
                "prompt": payload.prompt,
                "style": _profile_style(profile) if profile else payload.style,
                "emotion": payload.emotion,
                "source_asset_id": source_asset.id if source_asset else None,
                "extra_params": payload.extra_params,
            }
        ),
        created_at=now,
        updated_at=now,
    )
    db.add(job)
    db.add(
        JobEvent(
            id=str(uuid.uuid4()),
            job_id=job_id,
            event_type="job_queued",
            stage="validating",
            progress=0,
            payload_json=json.dumps({"message": "Job queued for local execution"}),
            created_at=now,
        )
    )

    if character and payload.kind == "canonical_generation":
        character.status = "GENERATING_CANONICAL"
        character.updated_at = now

    db.commit()
    db.refresh(job)
    return _serialize_job(job)


@router.get("/generation-jobs")
def list_generation_jobs(
    character_id: Optional[str] = Query(default=None),
    status: Optional[Literal["queued", "running", "succeeded", "failed", "cancelled"]] = Query(
        default=None
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    query = db.query(GenerationJob).filter(GenerationJob.user_id == current_user.id)
    if character_id:
        query = query.filter(GenerationJob.character_id == character_id)
    if status:
        query = query.filter(GenerationJob.status == status)
    jobs = query.order_by(GenerationJob.created_at.desc()).all()
    if any(_sync_character_lifecycle(db, job) for job in jobs):
        db.commit()
    return [_serialize_job(job) for job in jobs]


@router.get("/generation-jobs/{job_id}")
def get_generation_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    job = db.query(GenerationJob).filter(GenerationJob.id == job_id).first()
    if not job:
        raise ResourceNotFoundException(resource_type="GenerationJob", resource_id=job_id)
    if job.user_id != current_user.id:
        raise TenantAccessDeniedException()
    if _sync_character_lifecycle(db, job):
        db.commit()
        db.refresh(job)
    return _serialize_job(job)


@router.get("/generation-jobs/{job_id}/events")
def get_job_events(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
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
            "id": event.id,
            "job_id": event.job_id,
            "event_type": event.event_type,
            "stage": event.stage,
            "progress": event.progress,
            "payload": json.loads(event.payload_json),
            "created_at": event.created_at.isoformat(),
        }
        for event in events
    ]


@router.post("/generation-jobs/{job_id}/cancel")
def cancel_generation_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    job = db.query(GenerationJob).filter(GenerationJob.id == job_id).first()
    if not job:
        raise ResourceNotFoundException(resource_type="GenerationJob", resource_id=job_id)
    if job.user_id != current_user.id:
        raise TenantAccessDeniedException()

    if job.status in {"succeeded", "failed", "cancelled"}:
        return _serialize_job(job, message="Job is already finished.")

    now = datetime.now(timezone.utc)
    job.status = "cancelled"
    job.completed_at = now
    job.updated_at = now
    db.add(
        JobEvent(
            id=str(uuid.uuid4()),
            job_id=job_id,
            event_type="job_cancelled",
            stage=job.current_stage,
            progress=job.progress,
            payload_json=json.dumps({"message": "Job cancelled by user"}),
            created_at=now,
        )
    )
    db.commit()
    db.refresh(job)
    return _serialize_job(job, message="Job successfully cancelled.")
