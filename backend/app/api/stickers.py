from app.models.schemas import StickerJobResponse, StickerStyleOption
from app.services.sticker_pipeline import StickerPipelineService
from app.services.supabase_service import SupabaseService
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

router = APIRouter(prefix="/stickers", tags=["Stickers Engine"])
bearer_scheme = HTTPBearer(auto_error=False)


def require_current_user_id(
  credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)
) -> str:
  if not credentials or credentials.scheme.lower() != "bearer":
    raise HTTPException(
      status_code=status.HTTP_401_UNAUTHORIZED,
      detail="Vui lòng đăng nhập để tiếp tục."
    )

  user = SupabaseService.get_user_from_access_token(credentials.credentials)
  if not user or not getattr(user, "id", None):
    raise HTTPException(
      status_code=status.HTTP_401_UNAUTHORIZED,
      detail="Phiên đăng nhập không hợp lệ hoặc đã hết hạn."
    )
  return str(user.id)

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

@router.get("/styles", response_model=list[StickerStyleOption])
def get_sticker_styles():
  """
  Returns list of supported sticker styles
  """
  return STYLES_LIST

@router.post("/generate", response_model=StickerJobResponse)
async def generate_stickers(
  file: UploadFile = File(...),
  style_id: str = Form("3d-chibi"),
  user_id: str = Depends(require_current_user_id)
):
  """
  Accepts an authenticated user's image + style_id, uploads to Supabase Storage, and triggers AI pipeline job
  """
  # Read image bytes
  file_bytes = await file.read()
  if not file_bytes:
    raise HTTPException(status_code=400, detail="Tập tin tải lên không hợp lệ hoặc rỗng.")

  # Upload source image to Supabase Storage
  public_url = SupabaseService.upload_image_to_storage(file_bytes, file.filename or "portrait.png", file.content_type or "image/png")
  print(f"Uploaded source image to Supabase: {public_url}")

  # Create AI Generation Job
  job = StickerPipelineService.create_job(style_id=style_id, user_id=user_id)
  return job

@router.get("/jobs/{job_id}", response_model=StickerJobResponse)
def get_job_status(job_id: str):
  """
  Polls progress status of an AI generation job
  """
  job = StickerPipelineService.get_job(job_id)
  if not job:
    raise HTTPException(status_code=404, detail="Không tìm thấy tiến trình sinh sticker.")
  return job

@router.get("/history")
def get_sticker_history(user_id: str = Depends(require_current_user_id)):
  """
  Fetches saved sticker generation history for a user from Supabase Database
  """
  return SupabaseService.get_user_sticker_packs(user_id)


@router.delete("/history/{pack_id}")
def delete_sticker_history(
  pack_id: str,
  user_id: str = Depends(require_current_user_id)
):
  """Soft-deletes one sticker pack owned by the authenticated user."""
  if not SupabaseService.soft_delete_user_sticker_pack(user_id, pack_id):
    raise HTTPException(
      status_code=status.HTTP_404_NOT_FOUND,
      detail="Không tìm thấy bộ sticker trong lịch sử của bạn."
    )
  return {"id": pack_id, "is_deleted": True}
