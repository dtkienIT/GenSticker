from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime

# --- Auth Schemas ---
class UserLoginRequest(BaseModel):
  email: EmailStr
  password: str = Field(..., min_length=6)

class UserRegisterRequest(BaseModel):
  name: str = Field(..., min_length=2)
  email: EmailStr
  password: str = Field(..., min_length=6)

class UserResponse(BaseModel):
  id: str
  email: str
  name: str
  avatar_url: Optional[str] = None
  created_at: Optional[datetime] = None

class AuthTokenResponse(BaseModel):
  access_token: str
  token_type: str = "bearer"
  user: UserResponse

# --- Sticker Schemas ---
class StickerStyleOption(BaseModel):
  id: str
  name: str
  description: str
  preview_color: str
  badge: Optional[str] = None

class StickerItemResponse(BaseModel):
  id: str
  title: str
  emotion: str
  tags: List[str]
  image_url: str
  style_id: str
  is_favorite: bool = False
  width: int = 1024
  height: int = 1024
  file_size_kb: int = 150

class StickerJobCreate(BaseModel):
  style_id: str
  input_image_base64: Optional[str] = None

class ProcessStepProgress(BaseModel):
  id: int
  step_name: str
  description: str
  status: str  # pending | processing | completed | error
  progress: int  # 0 to 100

class StickerJobResponse(BaseModel):
  job_id: str
  status: str  # processing | completed | error
  current_step: int
  progress_percentage: int
  steps: List[ProcessStepProgress]
  stickers: Optional[List[StickerItemResponse]] = None
  error_message: Optional[str] = None
  preview_image_url: Optional[str] = None
  preview_image_urls: List[str] = Field(default_factory=list)
  quality_status: Optional[str] = None  # reviewing | accepted | rejected
  created_at: datetime

# --- Telegram Export Schemas ---
class TelegramExportRequest(BaseModel):
  pack_title: str = Field(..., min_length=2, max_length=64)
  pack_name: Optional[str] = None
  style_name: Optional[str] = "3D Chibi Cutie"
  sticker_ids: Optional[List[str]] = None
  sticker_images: Optional[List[str]] = None  # base64 PNG data from frontend

class TelegramExportResponse(BaseModel):
  success: bool
  pack_title: str
  pack_name: str
  pack_url: str
  telegram_deeplink: str
  qr_code_url: str
  total_stickers: int
  message: str

