from io import BytesIO
from typing import Annotated, List

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
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

STYLES_LIST: List[StickerStyleOption] = [
  StickerStyleOption(id="3d-chibi", name="3D Chibi Cutie", description="Soft polished 3D chibi portrait.", preview_color="#7c3aed", badge="HOT"),
  StickerStyleOption(id="anime-kawaii", name="Anime Kawaii", description="Clean hand-drawn Korean and Japanese sticker art.", preview_color="#ec4899", badge="Popular"),
  StickerStyleOption(id="cyberpunk", name="Cyberpunk Neon", description="Portrait sticker with restrained neon accents.", preview_color="#06b6d4", badge="Cyber"),
  StickerStyleOption(id="comic-pop", name="Comic Pop Art", description="Bold ink contours and controlled halftone accents.", preview_color="#f59e0b"),
  StickerStyleOption(id="pixel-retro", name="Pixel Retro", description="Detailed pixel-art portrait sticker.", preview_color="#10b981"),
  StickerStyleOption(id="claymation", name="Claymation 3D", description="Handcrafted clay character texture.", preview_color="#ef4444"),
  StickerStyleOption(id="doodle-line", name="Doodle Line Art", description="Minimal expressive editorial line work.", preview_color="#64748b"),
  StickerStyleOption(id="watercolor", name="Watercolor Soft", description="Soft watercolor portrait with controlled edges.", preview_color="#3b82f6"),
]


@router.get("/styles", response_model=List[StickerStyleOption])
def get_sticker_styles():
  return STYLES_LIST


@router.post("/generate", response_model=StickerJobResponse)
async def generate_stickers(
  user_id: Annotated[str, Depends(require_user_id)],
  file: UploadFile = File(...),
  style_id: str = Form("anime-kawaii"),
):
  if not settings.OPENAI_API_KEY.strip():
    raise HTTPException(status_code=503, detail="Backend OpenAI API key is not configured.")
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
  try:
    return StickerPipelineService.create_job(
      owner_id=user_id,
      style_id=style_id,
      file_bytes=file_bytes,
      filename=file.filename or "portrait.png",
      content_type=content_type,
    )
  except ValueError as error:
    if str(error) == "openai_api_key_required":
      raise HTTPException(status_code=503, detail="Backend OpenAI API key is not configured.") from error
    if str(error) == "generation_already_in_progress":
      raise HTTPException(status_code=409, detail="A sticker generation job is already running.") from error
    if str(error) == "generation_rate_limit_exceeded":
      raise HTTPException(status_code=429, detail="Hourly sticker generation limit reached.") from error
    if str(error) == "generation_capacity_reached":
      raise HTTPException(status_code=503, detail="Sticker generation is busy. Please try again later.") from error
    if str(error) == "generation_rate_limit_exceeded":
      raise HTTPException(status_code=429, detail="Hourly sticker generation limit reached.") from error
    raise HTTPException(status_code=400, detail="Unsupported sticker style.") from error


@router.get("/jobs/{job_id}", response_model=StickerJobResponse)
def get_job_status(
  job_id: str,
  response: Response,
  user_id: Annotated[str, Depends(require_user_id)],
):
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
  try:
    return StickerPipelineService.retry_job(job_id, owner_id=user_id)
  except ValueError as error:
    if str(error) == "job_not_found":
      raise HTTPException(status_code=404, detail="Sticker generation job was not found.") from error
    if str(error) in {"job_not_retryable", "job_artifacts_missing", "job_retry_limit_reached"}:
      raise HTTPException(status_code=409, detail="This sticker job cannot be retried.") from error
    if str(error) == "generation_capacity_reached":
      raise HTTPException(status_code=503, detail="Sticker generation is busy. Please try again later.") from error
    raise


@router.get("/history")
def get_sticker_history(user_id: Annotated[str, Depends(require_user_id)]):
  return SupabaseService.get_user_sticker_packs(user_id)
