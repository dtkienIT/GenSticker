import asyncio
import uuid
from datetime import datetime
from typing import Dict, List, Optional
from app.models.schemas import StickerJobResponse, ProcessStepProgress, StickerItemResponse

# In-memory job repository for active pipeline state
job_store: Dict[str, StickerJobResponse] = {}

PIPELINE_STEPS_CONFIG = [
  {
    "id": 1,
    "step_name": "Tách nền & Nhận diện khuôn mặt (BiRefNet & SAM2)",
    "description": "Tự động phân đoạn nhân vật, tách nền với độ phân giải cao và trích xuất Landmark khuôn mặt 3D.",
    "duration": 2.0
  },
  {
    "id": 2,
    "step_name": "Trích xuất đặc trưng cảm xúc (PuLID / InstantID Embedding)",
    "description": "Phân tích 512-d Face Vector để bảo tồn đặc trưng nhận dạng mắt, mũi, miệng của nhân vật.",
    "duration": 2.5
  },
  {
    "id": 3,
    "step_name": "Khởi tạo Style Vector & Render LoRA",
    "description": "Áp dụng mô hình SDXL-Lightning kết hợp LoRA nét vẽ nghệ thuật Chibi 3D / Anime.",
    "duration": 3.0
  },
  {
    "id": 4,
    "step_name": "Sinh bộ 20 Sticker cảm xúc đa dạng",
    "description": "Khởi tạo 20 biến thể biểu cảm: Vui vẻ, Thả tim, Phẫn nộ, Cực ngầu, Cày code, Ngủ ngon...",
    "duration": 2.5
  },
  {
    "id": 5,
    "step_name": "Đổ viền Sticker Die-Cut & Tối ưu PNG Transparent HD",
    "description": "Tạo đường viền trắng nổi 3D, hiệu ứng bóng mờ nhẹ và nén file PNG 1024x1024 sắc nét.",
    "duration": 2.0
  }
]

DEFAULT_20_STICKERS = [
  {"id": "stk_01", "title": "Siêu Hảo Hạng", "emotion": "Happy & Proud", "tags": ["Vui Vẻ", "Like", "No.1"], "color": "%237c3aed", "badge": "👍"},
  {"id": "stk_02", "title": "Thả Tim Ngập Tràn", "emotion": "Love & Affection", "tags": ["Thả Tim", "Yêu Thương", "Cute"], "color": "%23ec4899", "badge": "💖"},
  {"id": "stk_03", "title": "Đang Suy Nghĩ", "emotion": "Thinking", "tags": ["Suy Nghĩ", "Hỏi Đảo"], "color": "%2306b6d4", "badge": "🧐"},
  {"id": "stk_04", "title": "Cực Kỳ Phẫn Nộ", "emotion": "Angry", "tags": ["Tức Giận", "Nóng Máu", "Fire"], "color": "%23ef4444", "badge": "🤬"},
  {"id": "stk_05", "title": "Ngủ Ngon Lành", "emotion": "Sleeping & Chill", "tags": ["Gặp Mộng", "Sleep", "Chill"], "color": "%233b82f6", "badge": "😴"},
  {"id": "stk_06", "title": "Cười Bể Bụng", "emotion": "LOL Laughing", "tags": ["Cười Lớn", "Hài Hước", "LOL"], "color": "%23f59e0b", "badge": "🤣"},
  {"id": "stk_07", "title": "Khóc Nổi Sông", "emotion": "Crying", "tags": ["Buồn Khóc", "Sầu", "Drama"], "color": "%236366f1", "badge": "😭"},
  {"id": "stk_08", "title": "Ngầu Như Bồn Cầu", "emotion": "Cool Sunglasses", "tags": ["Ngầu", "Cool", "VIP"], "color": "%2310b981", "badge": "sunglasses"},
  {"id": "stk_09", "title": "Chăm Chỉ Cày Code", "emotion": "Working Hard", "tags": ["Deadline", "Work", "Coder"], "color": "%238b5cf6", "badge": "💻"},
  {"id": "stk_10", "title": "Xin Lỗi Được Chưa", "emotion": "Apologetic", "tags": ["Sorry", "Xin Lỗi"], "color": "%23f43f5e", "badge": "🙏"},
  {"id": "stk_11", "title": "Hoảng Hốt Sợ Hãi", "emotion": "Shocked", "tags": ["Sợ Hãi", "Shock", "OMG"], "color": "%23a855f7", "badge": "😱"},
  {"id": "stk_12", "title": "Quẩy Tiệc Đêm", "emotion": "Party & Dance", "tags": ["Party", "Dance", "Vui Vẻ"], "color": "%2306b6d4", "badge": "🥳"},
  {"id": "stk_13", "title": "Nạp Năng Lượng Cà Phê", "emotion": "Coffee Morning", "tags": ["Coffee", "Sáng Bật", "Work"], "color": "%23d97706", "badge": "☕"},
  {"id": "stk_14", "title": "Dâng Trào Quyết Tâm", "emotion": "Determined", "tags": ["Quyết Tâm", "Cố Lên", "Fight"], "color": "%23dc2626", "badge": "🔥"},
  {"id": "stk_15", "title": "Đơ Người Không Hiểu", "emotion": "Confused", "tags": ["Confused", "Chịu", "Hả"], "color": "%2364748b", "badge": "❓"},
  {"id": "stk_16", "title": "Ăn Mừng Chiến Thắng", "emotion": "Victory", "tags": ["Victory", "Winner", "Thắng"], "color": "%2310b981", "badge": "🏆"},
  {"id": "stk_17", "title": "Bay Bổng Mộng Mơ", "emotion": "Dreaming", "tags": ["Mộng Mơ", "Flying", "Cute"], "color": "%23f472b6", "badge": "✨"},
  {"id": "stk_18", "title": "Bất Lực Toàn Tập", "emotion": "Facepalm", "tags": ["Bất Lực", "Facepalm", "Trời Ơi"], "color": "%23f97316", "badge": "🤦‍♂️"},
  {"id": "stk_19", "title": "Thả Tim Bằng Tay", "emotion": "Finger Heart", "tags": ["FingerHeart", "Kpop", "Cute"], "color": "%23ec4899", "badge": "🫰"},
  {"id": "stk_20", "title": "Chúc Mừng Sinh Nhật", "emotion": "Happy Birthday", "tags": ["Birthday", "Bánh Kem", "Gift"], "color": "%238b5cf6", "badge": "🎂"}
]

class StickerPipelineService:
  @staticmethod
  def create_job(style_id: str, user_id: Optional[str] = None) -> StickerJobResponse:
    job_id = f"job_{uuid.uuid4().hex[:10]}"
    
    steps = [
      ProcessStepProgress(
        id=cfg["id"],
        step_name=cfg["step_name"],
        description=cfg["description"],
        status="pending" if cfg["id"] > 1 else "processing",
        progress=0
      )
      for cfg in PIPELINE_STEPS_CONFIG
    ]

    job_response = StickerJobResponse(
      job_id=job_id,
      status="processing",
      current_step=1,
      progress_percentage=0,
      steps=steps,
      created_at=datetime.utcnow()
    )

    job_store[job_id] = job_response
    
    # Trigger background pipeline runner
    asyncio.create_task(StickerPipelineService._run_pipeline_async(job_id, style_id, user_id))
    
    return job_response

  @staticmethod
  def get_job(job_id: str) -> Optional[StickerJobResponse]:
    return job_store.get(job_id)

  @staticmethod
  async def _run_pipeline_async(job_id: str, style_id: str, user_id: Optional[str] = None):
    """Simulate async 5-step AI pipeline execution"""
    job = job_store.get(job_id)
    if not job:
      return

    total_steps = len(PIPELINE_STEPS_CONFIG)
    
    for idx, cfg in enumerate(PIPELINE_STEPS_CONFIG):
      step_num = idx + 1
      job.current_step = step_num
      
      # Mark previous step completed
      if idx > 0:
        job.steps[idx - 1].status = "completed"
        job.steps[idx - 1].progress = 100

      job.steps[idx].status = "processing"
      
      # Simulate progress inside current step
      duration = cfg["duration"]
      ticks = 10
      for t in range(1, ticks + 1):
        await asyncio.sleep(duration / ticks)
        job.steps[idx].progress = int((t / ticks) * 100)
        overall = int(((idx + (t / ticks)) / total_steps) * 100)
        job.progress_percentage = min(overall, 99)

    # All steps completed
    job.steps[-1].status = "completed"
    job.steps[-1].progress = 100
    job.progress_percentage = 100
    job.status = "completed"

    # Generate 20 stickers result
    generated_stickers: List[StickerItemResponse] = []
    style_name = style_id.replace("-", " ").title()
    for stk in DEFAULT_20_STICKERS:
      svg_data = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle cx="100" cy="100" r="90" fill="{stk["color"]}"/><circle cx="70" cy="80" r="12" fill="white"/><circle cx="130" cy="80" r="12" fill="white"/><circle cx="70" cy="80" r="6" fill="%230f172a"/><circle cx="130" cy="80" r="6" fill="%230f172a"/><path d="M 65 130 Q 100 160 135 130" stroke="white" stroke-width="8" fill="none" stroke-linecap="round"/><text x="100" y="45" font-size="28" text-anchor="middle">{stk["badge"]}</text></svg>'
      
      generated_stickers.append(
        StickerItemResponse(
          id=stk["id"],
          title=stk["title"],
          emotion=stk["emotion"],
          tags=stk["tags"],
          image_url=f"data:image/svg+xml;utf8,{svg_data}",
          style_id=style_id,
          style_name=style_name,
          is_favorite=False,
          width=1024,
          height=1024,
          file_size_kb=145
        )
      )

    job.stickers = generated_stickers

    # Persist completed pack & stickers to Supabase Database
    try:
      from app.services.supabase_service import SupabaseService
      stk_dicts = [stk.model_dump() for stk in generated_stickers]
      SupabaseService.save_sticker_pack(
        user_id=user_id,
        title=f"Bộ Sticker {style_name}",
        prompt=None,
        style_id=style_id,
        style_name=style_name,
        stickers=stk_dicts
      )
    except Exception as save_err:
      print(f"⚠️ Note auto-saving pack to DB: {save_err}")
