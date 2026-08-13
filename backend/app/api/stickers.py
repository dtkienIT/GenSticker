import asyncio
import json
from collections.abc import AsyncIterator
from io import BytesIO
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile, status
from fastapi.responses import StreamingResponse
from PIL import Image, UnidentifiedImageError

from app.config import settings
from app.models.schemas import StickerJobResponse, StickerStyleOption
from app.security import require_user_id
from app.services.sticker_pipeline import StickerPipelineService
from app.services.supabase_service import SupabaseService

router = APIRouter(prefix="/stickers", tags=["Stickers Engine"])

MAX_UPLOAD_BYTES = 15 * 1024 * 1024
MAX_IMAGE_PIXELS = 40_000_000
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_IMAGE_FORMATS = {"JPEG", "PNG", "WEBP"}

STYLES_LIST: list[StickerStyleOption] = [
  StickerStyleOption(id="3d-chibi", name="3D Chibi Cutie", description="Phong cách 3D nhân vật tròn trịa, mắt to ngây thơ, ánh sáng mềm mại.", preview_color="#7c3aed", badge="HOT 🔥"),
  StickerStyleOption(id="anime-kawaii", name="Anime Kawaii", description="Nét vẽ Manga Nhật Bản dễ thương, tông màu pastel ngọt ngào.", preview_color="#ec4899", badge="Popular ✨"),
  StickerStyleOption(id="cyberpunk", name="Cyberpunk Neon", description="Phong cách tương lai với ánh đèn neon phát sáng và hiệu ứng holographic.", preview_color="#06b6d4", badge="Cyber ⚡"),
  StickerStyleOption(id="comic-pop", name="Comic Pop Art", description="Nét chấm Pop Art cổ điển, màu tương phản mạnh và chữ hiệu ứng.", preview_color="#f59e0b"),
  StickerStyleOption(id="pixel-retro", name="Pixel Retro 16-bit", description="Đồ họa Pixel hoài cổ 16-bit như các tựa game Arcade thập niên 90.", preview_color="#10b981"),
  StickerStyleOption(id="claymation", name="Claymation 3D", description="Tạo hình đất sét 3D thủ công độc đáo, texture nổi khối chân thực.", preview_color="#ef4444"),
  StickerStyleOption(id="doodle-line", name="Doodle Line Art", description="Nét phác thảo đen trắng đơn giản nhưng tinh tế và hài hước.", preview_color="#64748b"),
  StickerStyleOption(id="watercolor", name="Watercolor Soft", description="Màu nước mềm mại, vết loang màu nghệ thuật và mộng mơ.", preview_color="#3b82f6")
]


async def _read_validated_upload(file: UploadFile) -> tuple[bytes, str, str]:
  content_type = file.content_type or ""
  if content_type not in ALLOWED_CONTENT_TYPES:
    raise HTTPException(status_code=415, detail="Only PNG, JPG, and WEBP are supported.")

  file_bytes = await file.read(MAX_UPLOAD_BYTES + 1)
  if not file_bytes:
    raise HTTPException(status_code=400, detail="Uploaded image is empty.")
  if len(file_bytes) > MAX_UPLOAD_BYTES:
    raise HTTPException(status_code=413, detail="Image exceeds the 15 MB limit.")

  try:
    with Image.open(BytesIO(file_bytes)) as image:
      if image.format not in ALLOWED_IMAGE_FORMATS:
        raise HTTPException(status_code=415, detail="Uploaded file is not a supported image.")
      if image.width * image.height > MAX_IMAGE_PIXELS:
        raise HTTPException(status_code=413, detail="Image dimensions are too large.")
      image.verify()
  except HTTPException:
    raise
  except (UnidentifiedImageError, OSError, ValueError) as error:
    raise HTTPException(status_code=415, detail="Uploaded file is not a valid image.") from error

  safe_filename = Path((file.filename or "portrait.png").replace("\\", "/")).name or "portrait.png"
  return file_bytes, safe_filename, content_type


async def _store_source_image(
  file_bytes: bytes,
  safe_filename: str,
  content_type: str,
) -> None:
  await asyncio.to_thread(
    SupabaseService.upload_image_to_storage,
    file_bytes,
    safe_filename,
    content_type,
  )
  print("[OK] Uploaded source image to Supabase Storage")


def _create_job_or_raise(
  *,
  user_id: str,
  style_id: str,
  file_bytes: bytes,
  safe_filename: str,
  content_type: str,
) -> StickerJobResponse:
  try:
    return StickerPipelineService.create_job(
      owner_id=user_id,
      style_id=style_id,
      file_bytes=file_bytes,
      filename=safe_filename,
      content_type=content_type,
    )
  except ValueError as error:
    error_code = str(error)
    if error_code == "openai_api_key_required":
      raise HTTPException(status_code=503, detail="Backend OpenAI API key is not configured.") from error
    if error_code == "generation_already_in_progress":
      raise HTTPException(status_code=409, detail="A sticker generation job is already running.") from error
    if error_code == "generation_capacity_reached":
      raise HTTPException(status_code=503, detail="Sticker generation is busy. Please try again later.") from error
    raise HTTPException(status_code=400, detail="Unsupported sticker style.") from error


def _retry_job_or_raise(job_id: str, user_id: str) -> StickerJobResponse:
  try:
    return StickerPipelineService.retry_job(job_id, owner_id=user_id)
  except ValueError as error:
    error_code = str(error)
    if error_code == "job_not_found":
      raise HTTPException(status_code=404, detail="Sticker generation job was not found.") from error
    if error_code in {"job_not_retryable", "job_artifacts_missing", "job_retry_limit_reached"}:
      raise HTTPException(status_code=409, detail="This sticker job cannot be retried.") from error
    if error_code == "generation_capacity_reached":
      raise HTTPException(status_code=503, detail="Sticker generation is busy. Please try again later.") from error
    raise


async def _stream_job_updates(
  initial_job: StickerJobResponse,
  owner_id: str,
) -> AsyncIterator[str]:
  current = initial_job
  while True:
    yield json.dumps(
      current.model_dump(mode="json"),
      ensure_ascii=False,
      separators=(",", ":"),
    ) + "\n"
    if current.status != "processing":
      return
    await asyncio.sleep(0.5)
    refreshed = StickerPipelineService.get_job(current.job_id, owner_id=owner_id)
    if refreshed is None:
      current = current.model_copy(
        update={
          "status": "error",
          "error_message": "Phiên tạo sticker đã bị gián đoạn. Vui lòng thử lại.",
        }
      )
    else:
      current = refreshed


def _stream_response(job: StickerJobResponse, owner_id: str) -> StreamingResponse:
  return StreamingResponse(
    _stream_job_updates(job, owner_id),
    media_type="application/x-ndjson",
    headers={
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  )


@router.get("/styles", response_model=list[StickerStyleOption])
def get_sticker_styles():
  """Return the style contract used by the existing frontend."""
  return STYLES_LIST


@router.post("/generate", response_model=StickerJobResponse)
async def generate_stickers(
  user_id: Annotated[str, Depends(require_user_id)],
  file: UploadFile = File(...),
  style_id: str = Form("3d-chibi"),
):
  """Validate and store an authenticated portrait, then start the AI pipeline."""
  if not settings.OPENAI_API_KEY.strip():
    raise HTTPException(status_code=503, detail="Backend OpenAI API key is not configured.")

  file_bytes, safe_filename, content_type = await _read_validated_upload(file)
  await _store_source_image(file_bytes, safe_filename, content_type)
  job = _create_job_or_raise(
    user_id=user_id,
    style_id=style_id,
    file_bytes=file_bytes,
    safe_filename=safe_filename,
    content_type=content_type,
  )
  if settings.RUN_GENERATION_INLINE:
    return await StickerPipelineService.wait_for_job(job.job_id) or job
  return job


@router.post("/generate-stream", response_class=StreamingResponse)
async def generate_stickers_stream(
  user_id: Annotated[str, Depends(require_user_id)],
  file: UploadFile = File(...),
  style_id: str = Form("3d-chibi"),
):
  """Run one serverless-safe job while continuously streaming its real state."""
  if not settings.OPENAI_API_KEY.strip():
    raise HTTPException(status_code=503, detail="Backend OpenAI API key is not configured.")

  file_bytes, safe_filename, content_type = await _read_validated_upload(file)
  await _store_source_image(file_bytes, safe_filename, content_type)
  job = _create_job_or_raise(
    user_id=user_id,
    style_id=style_id,
    file_bytes=file_bytes,
    safe_filename=safe_filename,
    content_type=content_type,
  )
  return _stream_response(job, user_id)


@router.get("/jobs/{job_id}", response_model=StickerJobResponse)
def get_job_status(
  job_id: str,
  response: Response,
  user_id: Annotated[str, Depends(require_user_id)],
):
  """Return only jobs owned by the authenticated user."""
  response.headers["Cache-Control"] = "no-store, private"
  job = StickerPipelineService.get_job(job_id, owner_id=user_id)
  if not job:
    raise HTTPException(status_code=404, detail="Sticker generation job was not found.")
  return job


@router.post("/jobs/{job_id}/retry", response_model=StickerJobResponse)
async def retry_failed_sheet(
  job_id: str,
  user_id: Annotated[str, Depends(require_user_id)],
):
  """Retry a rejected sheet while reusing its private canonical artifacts."""
  job = _retry_job_or_raise(job_id, user_id)
  if settings.RUN_GENERATION_INLINE:
    return await StickerPipelineService.wait_for_job(job.job_id) or job
  return job


@router.post("/jobs/{job_id}/retry-stream", response_class=StreamingResponse)
async def retry_failed_sheet_stream(
  job_id: str,
  user_id: Annotated[str, Depends(require_user_id)],
):
  """Stream the retry in the same invocation that owns its private artifacts."""
  job = _retry_job_or_raise(job_id, user_id)
  return _stream_response(job, user_id)


@router.get("/history")
def get_sticker_history(user_id: Annotated[str, Depends(require_user_id)]):
  """Fetch active sticker packs owned by the authenticated user."""
  return SupabaseService.get_user_sticker_packs(user_id)


@router.delete("/history/{pack_id}")
def delete_sticker_history(
  pack_id: str,
  user_id: Annotated[str, Depends(require_user_id)],
):
  """Soft-delete one sticker pack owned by the authenticated user."""
  if not SupabaseService.soft_delete_user_sticker_pack(user_id, pack_id):
    raise HTTPException(
      status_code=status.HTTP_404_NOT_FOUND,
      detail="Không tìm thấy bộ sticker trong lịch sử của bạn."
    )
  return {"id": pack_id, "is_deleted": True}
