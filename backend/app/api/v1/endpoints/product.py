import hashlib
import json
import re
import uuid
from datetime import datetime, timedelta, timezone
from io import BytesIO
from typing import Any, Literal, NamedTuple, Optional, cast
from zipfile import ZIP_DEFLATED, ZipFile

from fastapi import APIRouter, Depends, Query
from PIL import Image as PILImage
from PIL import ImageDraw, ImageFont
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.errors import (
    GenStickerException,
    ResourceNotFoundException,
    TenantAccessDeniedException,
)
from backend.app.core.security import get_current_user
from backend.app.db.models.asset import Asset
from backend.app.db.models.character import Character, CharacterProfile
from backend.app.db.models.export import ExportManifest
from backend.app.db.models.job import GenerationJob, JobEvent
from backend.app.db.models.pack import Pack
from backend.app.db.models.user import User
from backend.app.db.session import get_db
from backend.app.domain.pack_state import (
    CORE_EIGHT_EMOTIONS,
    aggregate_pack_status,
    create_core_eight_slots,
    load_pack_slots,
    reconcile_pack_from_jobs,
    save_pack_slots,
)
from backend.app.storage import asset_store as asset_store_module

router = APIRouter()


class ConsentRequest(BaseModel):
    consent_version: str = Field(min_length=1, max_length=32)
    accepted: bool
    reuse_opt_in: bool = False
    accepted_at: Optional[datetime] = None


class CreateStickerPackRequest(BaseModel):
    character_id: str = Field(min_length=1)
    profile_version: int = Field(ge=1)
    template_id: str = Field(min_length=1, max_length=100)


class UpdateStickerTextRequest(BaseModel):
    text: str = Field(max_length=40)
    placement: Literal["top", "center", "bottom"]
    font_size: int = Field(ge=16, le=48)


class CreateExportRequest(BaseModel):
    formats: list[Literal["png", "webp", "zip"]] = Field(min_length=1)


class _RenderedSticker(NamedTuple):
    file_stem: str
    png_bytes: bytes
    webp_bytes: Optional[bytes]


class _ExportArtifact(NamedTuple):
    export_format: Literal["png", "webp", "zip"]
    file_name: str
    data: bytes


def _serialize_consent(user: User) -> dict[str, Any]:
    return {
        "consent_version": user.consent_version,
        "accepted": user.consent_accepted,
        "reuse_opt_in": user.consent_reuse_opt_in,
        "accepted_at": user.consent_accepted_at.isoformat() if user.consent_accepted_at else None,
    }


def _get_owned_pack(db: Session, pack_id: str, current_user: User) -> Pack:
    pack = db.query(Pack).filter(Pack.id == pack_id).first()
    if not pack:
        raise ResourceNotFoundException(resource_type="StickerPack", resource_id=pack_id)
    if pack.user_id != current_user.id:
        raise TenantAccessDeniedException()
    return pack


def _serialize_slot(slot: dict[str, Any]) -> dict[str, Any]:
    result = {
        "id": slot.get("id"),
        "emotion_id": slot.get("emotion_id"),
        "status": slot.get("status", "pending"),
        "progress": slot.get("progress", 0),
        "selected_asset_id": slot.get("selected_asset_id"),
        "candidate_asset_ids": slot.get("candidate_asset_ids", []),
        "error_code": slot.get("error_code"),
        "retry_count": slot.get("retry_count", 0),
    }
    for optional_key in ("image_uri", "previous_image_uri", "text"):
        value = slot.get(optional_key)
        if value is not None:
            result[optional_key] = value
    return result


def _sync_pack(db: Session, pack: Pack) -> None:
    jobs = (
        db.query(GenerationJob)
        .filter(GenerationJob.pack_id == pack.id)
        .order_by(GenerationJob.created_at.asc())
        .all()
    )
    if reconcile_pack_from_jobs(pack, jobs):
        pack.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(pack)


def _serialize_pack(pack: Pack) -> dict[str, Any]:
    return {
        "id": pack.id,
        "character_id": pack.character_id,
        "profile_version": pack.config_version,
        "template_id": pack.template_id,
        "status": pack.status.upper(),
        "slots": [_serialize_slot(slot) for slot in load_pack_slots(pack)],
        "created_at": pack.created_at.isoformat(),
        "updated_at": pack.updated_at.isoformat(),
    }


def _load_profile_config(profile: CharacterProfile) -> dict[str, Any]:
    try:
        value = json.loads(profile.config_json or "{}")
    except (TypeError, ValueError, json.JSONDecodeError):
        return {}
    return value if isinstance(value, dict) else {}


def _enqueue_slot_job(
    db: Session,
    *,
    current_user: User,
    pack: Pack,
    profile: CharacterProfile,
    slot: dict[str, Any],
    seed: int,
) -> GenerationJob:
    now = datetime.now(timezone.utc)
    config = _load_profile_config(profile)
    style = config.get("style", "chibi")
    if not isinstance(style, str):
        style = "chibi"

    job = GenerationJob(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        character_id=pack.character_id,
        pack_id=pack.id,
        kind="expression_generation",
        status="queued",
        current_stage="validating",
        progress=0,
        provider=settings.STICKER_PROVIDER,
        request_json=json.dumps(
            {
                "seed": seed,
                "workflow_version": "v1.0",
                "prompt": None,
                "style": style,
                "emotion": slot["emotion_id"],
                "source_asset_id": profile.canonical_asset_id,
                "extra_params": {"slot_id": slot["id"]},
            }
        ),
        created_at=now,
        updated_at=now,
    )
    db.add(job)
    db.add(
        JobEvent(
            id=str(uuid.uuid4()),
            job_id=job.id,
            event_type="job_queued",
            stage="validating",
            progress=0,
            payload_json=json.dumps(
                {
                    "message": "Sticker slot queued for generation",
                    "slot_id": slot["id"],
                    "emotion": slot["emotion_id"],
                }
            ),
            created_at=now,
        )
    )
    return job


def _find_slot(pack: Pack, slot_id: str) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    slots = load_pack_slots(pack)
    slot = next((item for item in slots if item.get("id") == slot_id), None)
    if slot is None:
        raise ResourceNotFoundException(resource_type="StickerSlot", resource_id=slot_id)
    return slots, slot


def _serialize_export(manifest: ExportManifest) -> dict[str, Any]:
    return {
        "id": manifest.id,
        "pack_id": manifest.pack_id,
        "formats": json.loads(manifest.formats_json or "[]"),
        "assets": json.loads(manifest.assets_json or "[]"),
        "checksums": json.loads(manifest.checksums_json or "{}"),
        "expires_at": manifest.expires_at.isoformat(),
        "native_share_available": manifest.native_share_available,
    }


def _load_export_font(font_size: int) -> Any:
    try:
        return ImageFont.truetype("DejaVuSans.ttf", font_size)
    except OSError:
        try:
            return ImageFont.load_default(size=font_size)
        except TypeError:
            return ImageFont.load_default()


def _render_slot_image(source_bytes: bytes, text_config: Any) -> PILImage.Image:
    with PILImage.open(BytesIO(source_bytes)) as source:
        source.load()
        image = cast(PILImage.Image, source.convert("RGBA"))

    if not isinstance(text_config, dict):
        return image
    text = text_config.get("text")
    if not isinstance(text, str) or not text.strip():
        return image

    raw_font_size = text_config.get("font_size", 28)
    font_size = raw_font_size if isinstance(raw_font_size, int) else 28
    font_size = max(16, min(48, font_size))
    placement = text_config.get("placement", "bottom")
    if placement not in {"top", "center", "bottom"}:
        placement = "bottom"

    font = _load_export_font(font_size)
    draw = ImageDraw.Draw(image)
    stroke_width = max(1, font_size // 12)
    bounds = draw.multiline_textbbox(
        (0, 0),
        text,
        font=font,
        align="center",
        stroke_width=stroke_width,
    )
    text_width = bounds[2] - bounds[0]
    text_height = bounds[3] - bounds[1]
    padding = max(8, min(image.width, image.height) // 32)
    x = (image.width - text_width) / 2 - bounds[0]
    if placement == "top":
        y = padding - bounds[1]
    elif placement == "center":
        y = (image.height - text_height) / 2 - bounds[1]
    else:
        y = image.height - padding - text_height - bounds[1]

    draw.multiline_text(
        (x, y),
        text,
        font=font,
        fill=(255, 255, 255, 255),
        align="center",
        stroke_width=stroke_width,
        stroke_fill=(0, 0, 0, 255),
    )
    return image


def _encode_export_image(image: PILImage.Image, export_format: Literal["png", "webp"]) -> bytes:
    output = BytesIO()
    if export_format == "png":
        image.save(output, format="PNG", optimize=True)
    else:
        image.save(output, format="WEBP", lossless=True, quality=100, method=6)
    return output.getvalue()


def _safe_export_stem(emotion_id: Any, index: int, used_stems: set[str]) -> str:
    raw_stem = emotion_id if isinstance(emotion_id, str) else ""
    base_stem = re.sub(r"[^A-Za-z0-9_-]+", "-", raw_stem).strip("-_").lower()
    base_stem = base_stem[:64] or f"sticker-{index + 1}"
    stem = base_stem
    suffix = 2
    while stem in used_stems:
        stem = f"{base_stem}-{suffix}"
        suffix += 1
    used_stems.add(stem)
    return stem


def _build_export_artifacts(
    rendered_stickers: list[_RenderedSticker],
    formats: list[Literal["png", "webp", "zip"]],
    pack_id: str,
) -> list[_ExportArtifact]:
    zip_output = BytesIO()
    with ZipFile(zip_output, mode="w", compression=ZIP_DEFLATED, compresslevel=9) as archive:
        for sticker in rendered_stickers:
            archive.writestr(f"{sticker.file_stem}.png", sticker.png_bytes)
    zip_bytes = zip_output.getvalue()

    artifacts: list[_ExportArtifact] = []
    for export_format in formats:
        if export_format == "zip":
            artifacts.append(
                _ExportArtifact(
                    export_format="zip",
                    file_name=f"sticker-pack-{pack_id}.zip",
                    data=zip_bytes,
                )
            )
            continue
        for sticker in rendered_stickers:
            data = sticker.png_bytes if export_format == "png" else sticker.webp_bytes
            if data is None:
                raise GenStickerException(
                    code="export_failed",
                    message="A requested sticker format could not be rendered.",
                    status_code=500,
                )
            artifacts.append(
                _ExportArtifact(
                    export_format=export_format,
                    file_name=f"{sticker.file_stem}.{export_format}",
                    data=data,
                )
            )
    return artifacts


@router.get("/consent")
def get_consent(current_user: User = Depends(get_current_user)) -> dict[str, Any]:
    return _serialize_consent(current_user)


@router.put("/consent")
def update_consent(
    payload: ConsentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    current_user.consent_version = payload.consent_version
    current_user.consent_accepted = payload.accepted
    current_user.consent_reuse_opt_in = payload.reuse_opt_in
    current_user.consent_accepted_at = (
        payload.accepted_at or datetime.now(timezone.utc) if payload.accepted else None
    )
    current_user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(current_user)
    return _serialize_consent(current_user)


@router.post("/sticker-packs")
def create_sticker_pack(
    payload: CreateStickerPackRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    if payload.template_id != "core-eight-v1":
        raise GenStickerException(
            code="invalid_pack_state",
            message=f"Unsupported emotion template '{payload.template_id}'.",
            status_code=422,
        )

    character = (
        db.query(Character)
        .filter(Character.id == payload.character_id, Character.deleted_at.is_(None))
        .first()
    )
    if not character:
        raise ResourceNotFoundException(resource_type="Character", resource_id=payload.character_id)
    if character.user_id != current_user.id:
        raise TenantAccessDeniedException()

    profile = (
        db.query(CharacterProfile)
        .filter(
            CharacterProfile.character_id == character.id,
            CharacterProfile.version == payload.profile_version,
        )
        .first()
    )
    if not profile:
        raise ResourceNotFoundException(
            resource_type="CharacterProfile",
            resource_id=f"{character.id}:{payload.profile_version}",
        )

    now = datetime.now(timezone.utc)
    slots = create_core_eight_slots()
    pack = Pack(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        character_id=character.id,
        status="QUEUED",
        config_version=profile.version,
        template_id=payload.template_id,
        slots_json="[]",
        created_at=now,
        updated_at=now,
    )
    save_pack_slots(pack, slots)
    db.add(pack)
    db.flush()

    for index, slot in enumerate(slots):
        _enqueue_slot_job(
            db,
            current_user=current_user,
            pack=pack,
            profile=profile,
            slot=slot,
            seed=42 + index,
        )

    db.commit()
    db.refresh(pack)
    return _serialize_pack(pack)


@router.get("/sticker-packs")
def list_sticker_packs(
    character_id: Optional[str] = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    query = db.query(Pack).filter(Pack.user_id == current_user.id)
    if character_id:
        query = query.filter(Pack.character_id == character_id)
    packs = query.order_by(Pack.created_at.desc()).all()
    for pack in packs:
        _sync_pack(db, pack)
    return [_serialize_pack(pack) for pack in packs]


@router.get("/sticker-packs/{pack_id}")
def get_sticker_pack(
    pack_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    pack = _get_owned_pack(db, pack_id, current_user)
    _sync_pack(db, pack)
    return _serialize_pack(pack)


@router.post("/sticker-packs/{pack_id}/slots/{slot_id}/regenerate")
def regenerate_sticker_slot(
    pack_id: str,
    slot_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    pack = _get_owned_pack(db, pack_id, current_user)
    _sync_pack(db, pack)
    slots, slot = _find_slot(pack, slot_id)
    if slot.get("status") in {"queued", "generating"}:
        raise GenStickerException(
            code="invalid_job_state",
            message="The sticker slot is already being generated.",
            status_code=409,
        )

    profile = (
        db.query(CharacterProfile)
        .filter(
            CharacterProfile.character_id == pack.character_id,
            CharacterProfile.version == pack.config_version,
        )
        .first()
    )
    if not profile:
        raise ResourceNotFoundException(
            resource_type="CharacterProfile",
            resource_id=f"{pack.character_id}:{pack.config_version}",
        )

    if slot.get("image_uri"):
        slot["previous_image_uri"] = slot["image_uri"]
    slot.update(
        status="queued",
        progress=0,
        selected_asset_id=None,
        candidate_asset_ids=[],
        image_uri=None,
        error_code=None,
        retry_count=int(slot.get("retry_count", 0)) + 1,
    )
    save_pack_slots(pack, slots)
    pack.status = aggregate_pack_status(slots)
    pack.updated_at = datetime.now(timezone.utc)
    _enqueue_slot_job(
        db,
        current_user=current_user,
        pack=pack,
        profile=profile,
        slot=slot,
        seed=int(datetime.now(timezone.utc).timestamp() * 1000) % 1_000_000,
    )
    db.commit()
    return _serialize_slot(slot)


@router.put("/sticker-packs/{pack_id}/slots/{slot_id}/text")
def update_sticker_text(
    pack_id: str,
    slot_id: str,
    payload: UpdateStickerTextRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    pack = _get_owned_pack(db, pack_id, current_user)
    _sync_pack(db, pack)
    slots, slot = _find_slot(pack, slot_id)
    slot["text"] = {
        "text": payload.text,
        "placement": payload.placement,
        "font_size": payload.font_size,
    }
    save_pack_slots(pack, slots)
    pack.updated_at = datetime.now(timezone.utc)
    db.commit()
    return _serialize_slot(slot)


@router.post("/sticker-packs/{pack_id}/exports")
def export_sticker_pack(
    pack_id: str,
    payload: CreateExportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    pack = _get_owned_pack(db, pack_id, current_user)
    _sync_pack(db, pack)
    slots = [
        slot
        for slot in load_pack_slots(pack)
        if slot.get("status") == "completed" and slot.get("selected_asset_id")
    ]
    if not slots:
        raise GenStickerException(
            code="pack_incomplete",
            message="The sticker pack does not have a completed sticker to export.",
            status_code=409,
        )

    formats = list(dict.fromkeys(payload.formats))
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(hours=settings.ASSET_TTL_HOURS)
    manifest_id = str(uuid.uuid4())
    stored_paths: list[str] = []
    try:
        rendered_stickers: list[_RenderedSticker] = []
        used_stems: set[str] = set()
        include_webp = "webp" in formats
        for index, slot in enumerate(slots):
            selected_asset = (
                db.query(Asset)
                .filter(
                    Asset.id == str(slot["selected_asset_id"]),
                    Asset.user_id == current_user.id,
                    Asset.deleted_at.is_(None),
                )
                .first()
            )
            if not selected_asset:
                raise GenStickerException(
                    code="export_failed",
                    message="A completed sticker asset could not be found.",
                    status_code=404,
                )

            source_bytes = asset_store_module.default_asset_store.read_bytes(
                selected_asset.relative_path
            )
            rendered_image = _render_slot_image(source_bytes, slot.get("text"))
            try:
                png_bytes = _encode_export_image(rendered_image, "png")
                webp_bytes = (
                    _encode_export_image(rendered_image, "webp") if include_webp else None
                )
            finally:
                rendered_image.close()
            rendered_stickers.append(
                _RenderedSticker(
                    file_stem=_safe_export_stem(slot.get("emotion_id"), index, used_stems),
                    png_bytes=png_bytes,
                    webp_bytes=webp_bytes,
                )
            )

        artifacts = _build_export_artifacts(rendered_stickers, formats, pack.id)
        export_assets: list[dict[str, Any]] = []
        checksums: dict[str, str] = {}
        for artifact in artifacts:
            stored = asset_store_module.default_asset_store.save_bytes(
                data=artifact.data,
                user_id=current_user.id,
                extension=f".{artifact.export_format}",
                asset_subfolder=f"exports/{manifest_id}",
            )
            stored_paths.append(stored.relative_path)
            export_asset = Asset(
                id=str(uuid.uuid4()),
                user_id=current_user.id,
                character_id=pack.character_id,
                job_id=None,
                asset_type="export",
                relative_path=stored.relative_path,
                mime_type=stored.mime_type,
                byte_size=stored.byte_size,
                sha256=stored.sha256,
                width=stored.width,
                height=stored.height,
                expires_at=expires_at,
                created_at=now,
            )
            db.add(export_asset)
            export_assets.append(
                {
                    "asset_id": export_asset.id,
                    "file_name": artifact.file_name,
                    "format": artifact.export_format,
                    "content_uri": f"/api/v1/assets/{export_asset.id}/content",
                }
            )
            checksums[export_asset.id] = hashlib.sha256(artifact.data).hexdigest()

        manifest = ExportManifest(
            id=manifest_id,
            user_id=current_user.id,
            pack_id=pack.id,
            formats_json=json.dumps(formats),
            assets_json=json.dumps(export_assets),
            checksums_json=json.dumps(checksums),
            expires_at=expires_at,
            native_share_available=False,
            created_at=now,
        )
        db.add(manifest)
        db.commit()
        return _serialize_export(manifest)
    except Exception as exc:
        db.rollback()
        for relative_path in stored_paths:
            try:
                asset_store_module.default_asset_store.delete_asset(relative_path)
            except Exception:
                pass
        if isinstance(exc, GenStickerException) and exc.code == "export_failed":
            raise
        raise GenStickerException(
            code="export_failed",
            message="The sticker pack could not be exported.",
            status_code=500,
        ) from exc


@router.get("/exports/{export_id}")
def get_export_manifest(
    export_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    manifest = db.query(ExportManifest).filter(ExportManifest.id == export_id).first()
    if not manifest:
        raise ResourceNotFoundException(resource_type="ExportManifest", resource_id=export_id)
    if manifest.user_id != current_user.id:
        raise TenantAccessDeniedException()
    expires_at = manifest.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= datetime.now(timezone.utc):
        raise GenStickerException(
            code="asset_url_expired",
            message="The export manifest has expired.",
            status_code=410,
        )
    return _serialize_export(manifest)


@router.get("/diagnostics")
def get_product_diagnostics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    characters_query = db.query(Character).filter(
        Character.user_id == current_user.id, Character.deleted_at.is_(None)
    )
    jobs = (
        db.query(GenerationJob)
        .filter(GenerationJob.user_id == current_user.id)
        .order_by(GenerationJob.created_at.desc())
        .all()
    )
    packs = (
        db.query(Pack)
        .filter(Pack.user_id == current_user.id)
        .order_by(Pack.created_at.desc())
        .all()
    )
    for pack in packs:
        _sync_pack(db, pack)

    profile_count = (
        db.query(CharacterProfile)
        .join(Character, CharacterProfile.character_id == Character.id)
        .filter(Character.user_id == current_user.id)
        .count()
    )
    event_count = (
        db.query(JobEvent)
        .join(GenerationJob, JobEvent.job_id == GenerationJob.id)
        .filter(GenerationJob.user_id == current_user.id)
        .count()
    )
    return {
        "service_mode": "http",
        "scenario": "happy_path",
        "counts": {
            "assets": db.query(Asset).filter(Asset.user_id == current_user.id).count(),
            "characters": characters_query.count(),
            "profiles": profile_count,
            "jobs": len(jobs),
            "job_events": event_count,
            "packs": len(packs),
            "exports": db.query(ExportManifest)
            .filter(ExportManifest.user_id == current_user.id)
            .count(),
        },
        "jobs": [
            {
                "id": job.id,
                "status": job.status,
                "stage": job.current_stage,
                "progress": job.progress,
            }
            for job in jobs
        ],
        "packs": [{"id": pack.id, "status": pack.status.upper()} for pack in packs],
        "last_safe_errors": [],
        "emotion_template": {
            "id": "core-eight-v1",
            "emotions": list(CORE_EIGHT_EMOTIONS),
        },
    }
