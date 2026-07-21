import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.core.errors import ResourceNotFoundException, TenantAccessDeniedException
from backend.app.core.security import get_current_user
from backend.app.db.models.asset import Asset
from backend.app.db.models.character import Character, CharacterProfile
from backend.app.db.models.job import GenerationJob
from backend.app.db.models.user import User
from backend.app.db.session import get_db
from backend.app.storage.asset_store import default_asset_store

router = APIRouter()


class CreateCharacterRequest(BaseModel):
    display_name: str = Field(min_length=1, max_length=255)
    selfie_asset_id: Optional[str] = None


class ApproveCanonicalRequest(BaseModel):
    canonical_asset_id: str = Field(min_length=1)
    config: Dict[str, Any] = Field(default_factory=dict)


class CreateProfileVersionRequest(BaseModel):
    config: Dict[str, Any] = Field(default_factory=dict)


def _get_owned_character(db: Session, character_id: str, current_user: User) -> Character:
    character = (
        db.query(Character)
        .filter(Character.id == character_id, Character.deleted_at.is_(None))
        .first()
    )
    if not character:
        raise ResourceNotFoundException(resource_type="Character", resource_id=character_id)
    if character.user_id != current_user.id:
        raise TenantAccessDeniedException()
    return character


def _normalize_character_status(character: Character) -> str:
    if character.deleted_at is not None or character.status.lower() == "deleted":
        return "DELETED"
    if character.approved_profile_version is not None:
        return "APPROVED"

    status = character.status.upper()
    if status in {"DRAFT", "GENERATING_CANONICAL", "AWAITING_APPROVAL", "APPROVED"}:
        return status
    return "DRAFT"


def _selfie_asset_id(db: Session, character_id: str) -> str | None:
    asset = (
        db.query(Asset)
        .filter(
            Asset.character_id == character_id,
            Asset.asset_type == "selfie",
            Asset.deleted_at.is_(None),
        )
        .order_by(Asset.created_at.asc())
        .first()
    )
    return asset.id if asset else None


def _serialize_profile(profile: CharacterProfile) -> dict[str, Any]:
    try:
        config = json.loads(profile.config_json or "{}")
    except (TypeError, ValueError, json.JSONDecodeError):
        config = {}
    return {
        "character_id": profile.character_id,
        "version": profile.version,
        "canonical_asset_id": profile.canonical_asset_id,
        "config": config,
        "approved_at": profile.approved_at.isoformat(),
    }


def _serialize_character(
    db: Session, character: Character, include_profiles: bool = False
) -> dict[str, Any]:
    result: dict[str, Any] = {
        "id": character.id,
        "user_id": character.user_id,
        "display_name": character.display_name,
        "status": _normalize_character_status(character),
        "selfie_asset_id": _selfie_asset_id(db, character.id),
        "approved_profile_version": character.approved_profile_version,
        "created_at": character.created_at.isoformat(),
        "updated_at": character.updated_at.isoformat(),
    }
    if include_profiles:
        profiles = (
            db.query(CharacterProfile)
            .filter(CharacterProfile.character_id == character.id)
            .order_by(CharacterProfile.version.desc())
            .all()
        )
        result["profiles"] = [_serialize_profile(profile) for profile in profiles]
    return result


def _next_profile_version(db: Session, character_id: str) -> int:
    latest = (
        db.query(func.max(CharacterProfile.version))
        .filter(CharacterProfile.character_id == character_id)
        .scalar()
    )
    return int(latest or 0) + 1


def _create_profile(
    db: Session,
    character: Character,
    canonical_asset_id: str,
    config: Dict[str, Any],
) -> CharacterProfile:
    now = datetime.now(timezone.utc)
    profile = CharacterProfile(
        id=str(uuid.uuid4()),
        character_id=character.id,
        version=_next_profile_version(db, character.id),
        canonical_asset_id=canonical_asset_id,
        config_json=json.dumps(config),
        approved_at=now,
        created_at=now,
    )
    db.add(profile)
    db.flush()
    character.approved_profile_version = profile.version
    character.status = "APPROVED"
    character.updated_at = now
    db.commit()
    db.refresh(profile)
    return profile


@router.post("/characters")
def create_character(
    payload: CreateCharacterRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    selfie_asset: Asset | None = None
    if payload.selfie_asset_id:
        selfie_asset = (
            db.query(Asset)
            .filter(Asset.id == payload.selfie_asset_id, Asset.deleted_at.is_(None))
            .first()
        )
        if not selfie_asset:
            raise ResourceNotFoundException(
                resource_type="Asset", resource_id=payload.selfie_asset_id
            )
        if selfie_asset.user_id != current_user.id:
            raise TenantAccessDeniedException()

    now = datetime.now(timezone.utc)
    character = Character(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        display_name=payload.display_name,
        status="DRAFT",
        created_at=now,
        updated_at=now,
    )
    db.add(character)
    db.flush()

    if selfie_asset:
        selfie_asset.character_id = character.id

    db.commit()
    db.refresh(character)
    return _serialize_character(db, character)


@router.get("/characters")
def list_characters(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    characters = (
        db.query(Character)
        .filter(Character.user_id == current_user.id, Character.deleted_at.is_(None))
        .order_by(Character.created_at.desc())
        .all()
    )
    return [_serialize_character(db, character) for character in characters]


@router.get("/characters/{character_id}")
def get_character(
    character_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    character = _get_owned_character(db, character_id, current_user)
    return _serialize_character(db, character, include_profiles=True)


@router.get("/characters/{character_id}/canonical-candidates")
def get_canonical_candidates(
    character_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    character = _get_owned_character(db, character_id, current_user)
    job = (
        db.query(GenerationJob)
        .filter(
            GenerationJob.user_id == current_user.id,
            GenerationJob.character_id == character.id,
            GenerationJob.kind == "canonical_generation",
            GenerationJob.status == "succeeded",
        )
        .order_by(GenerationJob.created_at.desc())
        .first()
    )
    if not job or not job.result_json:
        return []

    try:
        result = json.loads(job.result_json)
    except (TypeError, ValueError, json.JSONDecodeError):
        return []
    raw_candidates = result.get("candidates", []) if isinstance(result, dict) else []

    candidates: list[dict[str, Any]] = []
    for raw in raw_candidates if isinstance(raw_candidates, list) else []:
        if not isinstance(raw, dict):
            continue
        asset_id = raw.get("asset_id") or raw.get("id")
        if not isinstance(asset_id, str):
            continue
        asset = (
            db.query(Asset)
            .filter(
                Asset.id == asset_id,
                Asset.user_id == current_user.id,
                Asset.character_id == character.id,
                Asset.deleted_at.is_(None),
            )
            .first()
        )
        if not asset:
            continue
        index = len(candidates)
        candidates.append(
            {
                "asset_id": asset.id,
                "image_uri": f"/api/v1/assets/{asset.id}/content",
                "score_summary": {
                    "likeness": "good",
                    "clarity": "good",
                    "consistency": "good",
                },
                "recommended": index == 0,
            }
        )

    if candidates and character.approved_profile_version is None:
        character.status = "AWAITING_APPROVAL"
        character.updated_at = datetime.now(timezone.utc)
        db.commit()
    return candidates


@router.post("/characters/{character_id}/profiles/approve")
def approve_canonical(
    character_id: str,
    payload: ApproveCanonicalRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    character = _get_owned_character(db, character_id, current_user)
    asset = (
        db.query(Asset)
        .filter(Asset.id == payload.canonical_asset_id, Asset.deleted_at.is_(None))
        .first()
    )
    if not asset:
        raise ResourceNotFoundException(
            resource_type="Asset", resource_id=payload.canonical_asset_id
        )
    if asset.user_id != current_user.id:
        raise TenantAccessDeniedException()
    if asset.character_id != character.id or asset.asset_type != "canonical":
        raise ResourceNotFoundException(
            resource_type="CanonicalCandidate", resource_id=payload.canonical_asset_id
        )

    profile = _create_profile(db, character, asset.id, payload.config)
    return _serialize_profile(profile)


@router.get("/characters/{character_id}/profiles")
def get_character_profile(
    character_id: str,
    version: Optional[int] = Query(default=None, ge=1),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    character = _get_owned_character(db, character_id, current_user)
    query = db.query(CharacterProfile).filter(CharacterProfile.character_id == character.id)
    if version is not None:
        profile = query.filter(CharacterProfile.version == version).first()
    else:
        profile = query.order_by(CharacterProfile.version.desc()).first()
    if not profile:
        resource_id = f"{character.id}:{version or 'latest'}"
        raise ResourceNotFoundException(resource_type="CharacterProfile", resource_id=resource_id)
    return _serialize_profile(profile)


@router.post("/characters/{character_id}/profiles")
def create_character_profile_version(
    character_id: str,
    payload: CreateProfileVersionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    character = _get_owned_character(db, character_id, current_user)
    current_profile = (
        db.query(CharacterProfile)
        .filter(CharacterProfile.character_id == character.id)
        .order_by(CharacterProfile.version.desc())
        .first()
    )
    if not current_profile:
        raise ResourceNotFoundException(
            resource_type="CharacterProfile", resource_id=f"{character.id}:latest"
        )
    profile = _create_profile(db, character, current_profile.canonical_asset_id, payload.config)
    return _serialize_profile(profile)


@router.delete("/characters/{character_id}")
def delete_character(
    character_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    character = db.query(Character).filter(Character.id == character_id).first()
    if not character:
        return {"status": "deleted", "character_id": character_id}
    if character.user_id != current_user.id:
        raise TenantAccessDeniedException()

    now = datetime.now(timezone.utc)
    character.status = "DELETED"
    character.deleted_at = now
    character.updated_at = now

    assets = db.query(Asset).filter(Asset.character_id == character_id).all()
    for asset in assets:
        asset.deleted_at = now
        default_asset_store.delete_asset(asset.relative_path)

    db.commit()
    return {"status": "deleted", "character_id": character_id}
