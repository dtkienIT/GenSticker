import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.core.errors import ResourceNotFoundException, TenantAccessDeniedException
from backend.app.core.security import get_current_user
from backend.app.db.models.asset import Asset
from backend.app.db.models.character import Character, CharacterProfile
from backend.app.db.models.user import User
from backend.app.db.session import get_db
from backend.app.storage.asset_store import default_asset_store

router = APIRouter()


class CreateCharacterRequest(BaseModel):
    display_name: str
    selfie_asset_id: Optional[str] = None


@router.post("/characters")
def create_character(
    payload: CreateCharacterRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.selfie_asset_id:
        asset = db.query(Asset).filter(Asset.id == payload.selfie_asset_id, Asset.deleted_at.is_(None)).first()
        if not asset:
            raise ResourceNotFoundException(resource_type="Asset", resource_id=payload.selfie_asset_id)
        if asset.user_id != current_user.id:
            raise TenantAccessDeniedException()

    character = Character(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        display_name=payload.display_name,
        status="active",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(character)
    db.commit()
    db.refresh(character)

    if payload.selfie_asset_id:
        asset = db.query(Asset).filter(Asset.id == payload.selfie_asset_id, Asset.deleted_at.is_(None)).first()
        if asset:
            asset.character_id = character.id
            db.commit()

    return {
        "id": character.id,
        "user_id": character.user_id,
        "display_name": character.display_name,
        "status": character.status,
        "approved_profile_version": character.approved_profile_version,
        "created_at": character.created_at.isoformat(),
        "updated_at": character.updated_at.isoformat(),
    }


@router.get("/characters")
def list_characters(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    characters = (
        db.query(Character)
        .filter(Character.user_id == current_user.id, Character.deleted_at.is_(None))
        .order_by(Character.created_at.desc())
        .all()
    )
    return [
        {
            "id": c.id,
            "user_id": c.user_id,
            "display_name": c.display_name,
            "status": c.status,
            "approved_profile_version": c.approved_profile_version,
            "created_at": c.created_at.isoformat(),
            "updated_at": c.updated_at.isoformat(),
        }
        for c in characters
    ]


@router.get("/characters/{character_id}")
def get_character(
    character_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    character = db.query(Character).filter(Character.id == character_id, Character.deleted_at.is_(None)).first()
    if not character:
        raise ResourceNotFoundException(resource_type="Character", resource_id=character_id)
    if character.user_id != current_user.id:
        raise TenantAccessDeniedException()

    profiles = (
        db.query(CharacterProfile)
        .filter(CharacterProfile.character_id == character.id)
        .order_by(CharacterProfile.version.desc())
        .all()
    )

    return {
        "id": character.id,
        "user_id": character.user_id,
        "display_name": character.display_name,
        "status": character.status,
        "approved_profile_version": character.approved_profile_version,
        "created_at": character.created_at.isoformat(),
        "updated_at": character.updated_at.isoformat(),
        "profiles": [
            {
                "id": p.id,
                "version": p.version,
                "canonical_asset_id": p.canonical_asset_id,
                "approved_at": p.approved_at.isoformat(),
            }
            for p in profiles
        ],
    }


@router.delete("/characters/{character_id}")
def delete_character(
    character_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    character = db.query(Character).filter(Character.id == character_id).first()
    if not character:
        # Idempotent delete
        return {"status": "deleted", "character_id": character_id}

    if character.user_id != current_user.id:
        raise TenantAccessDeniedException()

    now = datetime.now(timezone.utc)

    # Soft delete character
    character.status = "deleted"
    character.deleted_at = now
    character.updated_at = now

    # Cascade soft delete to associated assets and clean local files
    assets = db.query(Asset).filter(Asset.character_id == character_id).all()
    for a in assets:
        a.deleted_at = now
        default_asset_store.delete_asset(a.relative_path)

    db.commit()
    return {"status": "deleted", "character_id": character_id}
