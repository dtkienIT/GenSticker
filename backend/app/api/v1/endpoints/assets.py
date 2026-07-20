import uuid
from datetime import datetime, timezone
from pathlib import Path

from backend.app.core.errors import ResourceNotFoundException, TenantAccessDeniedException
from backend.app.core.security import get_current_user
from backend.app.db.models.asset import Asset
from backend.app.db.models.user import User
from backend.app.db.session import get_db
from backend.app.domain.validation import default_selfie_validator
from backend.app.storage.asset_store import default_asset_store
from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

router = APIRouter()


@router.post("/assets/selfies")
async def upload_selfie(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    content = await file.read()

    # Validate selfie image
    val_result = default_selfie_validator.validate(content, file.content_type)
    if not val_result.valid:
        return {
            "asset": None,
            "validation": val_result.model_dump(),
        }

    # Determine extension
    ext = ".png"
    if val_result.mime_type == "image/jpeg":
        ext = ".jpg"
    elif val_result.mime_type == "image/webp":
        ext = ".webp"

    # Save to local asset store
    stored = default_asset_store.save_bytes(
        data=content,
        user_id=current_user.id,
        extension=ext,
        asset_subfolder="selfies",
    )

    # Record in DB
    asset = Asset(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        character_id=None,
        job_id=None,
        asset_type="selfie",
        relative_path=stored.relative_path,
        mime_type=stored.mime_type,
        byte_size=stored.byte_size,
        sha256=stored.sha256,
        width=stored.width,
        height=stored.height,
        created_at=datetime.now(timezone.utc),
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)

    return {
        "asset": {
            "id": asset.id,
            "user_id": asset.user_id,
            "asset_type": asset.asset_type,
            "relative_path": asset.relative_path,
            "mime_type": asset.mime_type,
            "byte_size": asset.byte_size,
            "sha256": asset.sha256,
            "width": asset.width,
            "height": asset.height,
            "created_at": asset.created_at.isoformat(),
        },
        "validation": val_result.model_dump(),
    }


@router.get("/assets/{asset_id}")
def get_asset_metadata(
    asset_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    asset = db.query(Asset).filter(Asset.id == asset_id, Asset.deleted_at.is_(None)).first()
    if not asset:
        raise ResourceNotFoundException(resource_type="Asset", resource_id=asset_id)
    if asset.user_id != current_user.id:
        raise TenantAccessDeniedException()

    return {
        "id": asset.id,
        "user_id": asset.user_id,
        "character_id": asset.character_id,
        "job_id": asset.job_id,
        "asset_type": asset.asset_type,
        "relative_path": asset.relative_path,
        "mime_type": asset.mime_type,
        "byte_size": asset.byte_size,
        "sha256": asset.sha256,
        "width": asset.width,
        "height": asset.height,
        "created_at": asset.created_at.isoformat(),
    }


@router.get("/assets/{asset_id}/content")
def get_asset_content(
    asset_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    asset = db.query(Asset).filter(Asset.id == asset_id, Asset.deleted_at.is_(None)).first()
    if not asset:
        raise ResourceNotFoundException(resource_type="Asset", resource_id=asset_id)
    if asset.user_id != current_user.id:
        raise TenantAccessDeniedException()

    abs_path = default_asset_store.get_absolute_path(asset.relative_path)
    if not abs_path.exists():
        raise ResourceNotFoundException(resource_type="AssetContent", resource_id=asset_id)

    return FileResponse(
        path=abs_path,
        media_type=asset.mime_type,
        filename=Path(asset.relative_path).name,
    )
