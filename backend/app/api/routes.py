from __future__ import annotations

import re
import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Depends, File, Form, Header, Response, UploadFile, status
from fastapi.responses import Response as BinaryResponse

from app.config import Settings
from app.dependencies import get_principal, get_repository
from app.domain import MockScenario, Principal
from app.errors import bad_request
from app.repository import Repository
from app.schemas import (
    JobCreateRequest,
    JobListResponse,
    JobResponse,
    RegenerateRequest,
    SavedPackListResponse,
    SavedPackResponse,
    SaveSetRequest,
    SourceResponse,
    StickerSetResponse,
)

router = APIRouter(prefix="/api/v1")

SUPPORTED_UPLOADS: dict[str, tuple[bytes, ...]] = {
    "image/jpeg": (b"\xff\xd8\xff",),
    "image/png": (b"\x89PNG\r\n\x1a\n",),
    "image/webp": (b"RIFF",),
    "image/heic": (b"ftypheic", b"ftypheix", b"ftyphevc", b"ftyphevx"),
    "image/heif": (b"ftypmif1", b"ftypmsf1"),
}
IDEMPOTENCY_KEY_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.:-]{7,127}$")


def _idempotency_key(value: str | None) -> str:
    if value is None:
        return str(uuid.uuid4())
    if not IDEMPOTENCY_KEY_PATTERN.fullmatch(value):
        raise bad_request(
            "INVALID_IDEMPOTENCY_KEY",
            "Idempotency-Key must contain 8-128 safe characters.",
        )
    return value


def _validate_upload_signature(mime_type: str, content: bytes) -> None:
    signatures = SUPPORTED_UPLOADS.get(mime_type)
    if signatures is None:
        raise bad_request(
            "UNSUPPORTED_IMAGE_TYPE",
            "The demo accepts JPEG, PNG, WebP, HEIC, or HEIF images.",
        )
    if mime_type == "image/webp":
        valid = content.startswith(b"RIFF") and content[8:12] == b"WEBP"
    elif mime_type in {"image/heic", "image/heif"}:
        valid = len(content) >= 12 and any(content[4:12].startswith(sig) for sig in signatures)
    else:
        valid = any(content.startswith(signature) for signature in signatures)
    if not valid:
        raise bad_request(
            "IMAGE_SIGNATURE_MISMATCH",
            "The uploaded bytes do not match the declared image type.",
        )


def _source_response(source: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": source["id"],
        "status": source["status"],
        "mime_type": source["mime_type"],
        "byte_size": source["byte_size"],
        "created_at": source["created_at"],
        "expires_at": source["expires_at"],
        "subject_type": source.get("subject_type", "person"),
        "consent": {
            "version": source["consent_version"],
            "accepted_at": source["accepted_at"],
        },
        "validation_mode": source["pipeline_mode"],
        "validation_results": source["validation_results"],
    }


def _job_response(job: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": job["id"],
        "source_image_id": job["source_image_id"],
        "regenerated_from_job_id": job.get("regenerated_from_job_id"),
        "style_id": job.get("style_id", "chibi_3d"),
        "locale": job.get("locale", "vi"),
        "catalog_version": job.get("catalog_version", "v1"),
        "status": job["status"],
        "stage": job["stage"],
        "progress": job["progress"],
        "safe_error_code": job.get("safe_error_code"),
        "sticker_set_id": job.get("sticker_set_id"),
        "mocked": job["mocked"],
        "created_at": job["created_at"],
        "updated_at": job["updated_at"],
        "completed_at": job.get("completed_at"),
    }


def _set_response(sticker_set: dict[str, Any]) -> dict[str, Any]:
    stickers = []
    for sticker in sticker_set["stickers"]:
        stickers.append(
            {
                **sticker,
                "asset_url": f"/api/v1/stickers/{sticker['id']}/asset",
            }
        )
    return {**sticker_set, "stickers": stickers}


def _pack_response(pack: dict[str, Any]) -> dict[str, Any]:
    stickers = []
    for sticker in pack["stickers"]:
        stickers.append(
            {
                "id": sticker["id"],
                "ordinal": sticker.get("saved_ordinal", sticker.get("ordinal")),
                "source_ordinal": sticker.get("source_ordinal", sticker.get("ordinal")),
                "expression_key": sticker["expression_key"],
                "mime_type": sticker["mime_type"],
                "moderation_status": sticker["moderation_status"],
                "asset_url": f"/api/v1/stickers/{sticker['id']}/asset",
                "created_at": sticker["created_at"],
            }
        )
    return {
        "id": pack["id"],
        "source_set_id": pack["source_set_id"],
        "title": pack["title"],
        "created_at": pack["created_at"],
        "sticker_count": len(stickers),
        "stickers": stickers,
    }


def _validate_mock_scenario(settings: Settings, scenario: MockScenario) -> None:
    if scenario is not MockScenario.SUCCESS and not settings.mock_scenarios_enabled:
        raise bad_request(
            "MOCK_SCENARIO_DISABLED",
            "Mock failure scenarios are available only in development and test.",
        )


@router.post(
    "/source-images",
    response_model=SourceResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_source(
    file: Annotated[UploadFile, File()],
    consent_accepted: Annotated[bool, Form()],
    consent_version: Annotated[str, Form(min_length=1, max_length=64)],
    principal: Annotated[Principal, Depends(get_principal)],
    repository: Annotated[Repository, Depends(get_repository)],
) -> dict[str, Any]:
    settings = repository.settings
    if not consent_accepted:
        raise bad_request(
            "CONSENT_REQUIRED",
            "Consent must be accepted for the current source image.",
        )
    content = file.file.read(settings.max_upload_bytes + 1)
    if not content:
        raise bad_request("EMPTY_UPLOAD", "The source image is empty.")
    if len(content) > settings.max_upload_bytes:
        raise bad_request(
            "IMAGE_TOO_LARGE",
            "The source image exceeds the configured demo upload limit.",
        )
    mime_type = (file.content_type or "").lower()
    _validate_upload_signature(mime_type, content)
    source = repository.create_source(
        owner_id=principal.owner_id,
        content=content,
        mime_type=mime_type,
        consent_version=consent_version,
    )
    return _source_response(source)


@router.get("/source-images/{source_id}", response_model=SourceResponse)
def get_source(
    source_id: str,
    principal: Annotated[Principal, Depends(get_principal)],
    repository: Annotated[Repository, Depends(get_repository)],
) -> dict[str, Any]:
    return _source_response(repository.get_source(owner_id=principal.owner_id, source_id=source_id))


@router.post(
    "/generation-jobs",
    response_model=JobResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def create_job(
    payload: JobCreateRequest,
    response: Response,
    principal: Annotated[Principal, Depends(get_principal)],
    repository: Annotated[Repository, Depends(get_repository)],
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> dict[str, Any]:
    settings = repository.settings
    _validate_mock_scenario(settings, payload.mock_scenario)
    job, created = repository.create_job(
        owner_id=principal.owner_id,
        source_id=payload.source_image_id,
        scenario=payload.mock_scenario.value,
        style_id=payload.style_id.value,
        locale=payload.locale,
        catalog_version=payload.catalog_version,
        idempotency_key=_idempotency_key(idempotency_key),
    )
    if not created:
        response.status_code = status.HTTP_200_OK
    return _job_response(job)


@router.get("/generation-jobs", response_model=JobListResponse)
def list_jobs(
    principal: Annotated[Principal, Depends(get_principal)],
    repository: Annotated[Repository, Depends(get_repository)],
    active: bool = False,
) -> dict[str, Any]:
    jobs = repository.list_jobs(owner_id=principal.owner_id, active_only=active)
    return {"items": [_job_response(job) for job in jobs]}


@router.get("/generation-jobs/{job_id}", response_model=JobResponse)
def get_job(
    job_id: str,
    principal: Annotated[Principal, Depends(get_principal)],
    repository: Annotated[Repository, Depends(get_repository)],
) -> dict[str, Any]:
    return _job_response(repository.get_job(owner_id=principal.owner_id, job_id=job_id))


@router.post(
    "/generation-jobs/{job_id}/regenerate",
    response_model=JobResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def regenerate_job(
    job_id: str,
    payload: RegenerateRequest,
    response: Response,
    principal: Annotated[Principal, Depends(get_principal)],
    repository: Annotated[Repository, Depends(get_repository)],
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> dict[str, Any]:
    settings = repository.settings
    _validate_mock_scenario(settings, payload.mock_scenario)
    parent = repository.get_job(owner_id=principal.owner_id, job_id=job_id)
    child, created = repository.create_job(
        owner_id=principal.owner_id,
        source_id=parent["source_image_id"],
        scenario=payload.mock_scenario.value,
        idempotency_key=_idempotency_key(idempotency_key),
        regenerated_from_job_id=job_id,
        style_id=parent.get("style_id", "chibi_3d"),
        locale=parent.get("locale", "vi"),
        catalog_version=parent.get("catalog_version", "v1"),
    )
    if not created:
        response.status_code = status.HTTP_200_OK
    return _job_response(child)


@router.get("/sticker-sets/{set_id}", response_model=StickerSetResponse)
def get_sticker_set(
    set_id: str,
    principal: Annotated[Principal, Depends(get_principal)],
    repository: Annotated[Repository, Depends(get_repository)],
) -> dict[str, Any]:
    return _set_response(repository.get_set(owner_id=principal.owner_id, set_id=set_id))


@router.post(
    "/sticker-sets/{set_id}/save",
    response_model=SavedPackResponse,
    status_code=status.HTTP_201_CREATED,
)
def save_sticker_set(
    set_id: str,
    payload: SaveSetRequest,
    response: Response,
    principal: Annotated[Principal, Depends(get_principal)],
    repository: Annotated[Repository, Depends(get_repository)],
    idempotency_key: Annotated[str | None, Header(alias="Idempotency-Key")] = None,
) -> dict[str, Any]:
    pack, created = repository.save_set(
        owner_id=principal.owner_id,
        set_id=set_id,
        sticker_ids=payload.sticker_ids,
        idempotency_key=_idempotency_key(idempotency_key),
    )
    if not created:
        response.status_code = status.HTTP_200_OK
    return _pack_response(pack)


@router.get("/saved-packs", response_model=SavedPackListResponse)
def list_saved_packs(
    principal: Annotated[Principal, Depends(get_principal)],
    repository: Annotated[Repository, Depends(get_repository)],
) -> dict[str, Any]:
    packs = repository.list_packs(owner_id=principal.owner_id)
    return {"items": [_pack_response(pack) for pack in packs]}


@router.get("/saved-packs/{pack_id}", response_model=SavedPackResponse)
def get_saved_pack(
    pack_id: str,
    principal: Annotated[Principal, Depends(get_principal)],
    repository: Annotated[Repository, Depends(get_repository)],
) -> dict[str, Any]:
    return _pack_response(repository.get_pack(owner_id=principal.owner_id, pack_id=pack_id))


@router.delete("/saved-packs/{pack_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_saved_pack(
    pack_id: str,
    principal: Annotated[Principal, Depends(get_principal)],
    repository: Annotated[Repository, Depends(get_repository)],
) -> Response:
    repository.delete_pack(owner_id=principal.owner_id, pack_id=pack_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/stickers/{sticker_id}/asset")
def get_sticker_asset(
    sticker_id: str,
    principal: Annotated[Principal, Depends(get_principal)],
    repository: Annotated[Repository, Depends(get_repository)],
) -> BinaryResponse:
    content, mime_type, filename = repository.get_sticker_asset(
        owner_id=principal.owner_id,
        sticker_id=sticker_id,
    )
    return BinaryResponse(
        content=content,
        media_type=mime_type,
        headers={
            "Content-Disposition": f'inline; filename="{filename}"',
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )
