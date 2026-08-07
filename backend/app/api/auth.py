from fastapi import APIRouter, HTTPException, status
from app.models.schemas import UserLoginRequest, UserRegisterRequest, AuthTokenResponse, UserResponse
from app.services.supabase_service import SupabaseService
import uuid

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=AuthTokenResponse)
async def login(payload: UserLoginRequest):
  """
  Login user via Supabase Auth
  """
  res = await SupabaseService.authenticate_user(payload.email, payload.password)
  
  if res and hasattr(res, "user") and res.user:
    user_data = res.user
    session_obj = getattr(res, "session", None)
    token = session_obj.access_token if session_obj and hasattr(session_obj, "access_token") else f"user_jwt_{uuid.uuid4().hex[:16]}"
    
    return AuthTokenResponse(
      access_token=token,
      user=UserResponse(
        id=user_data.id,
        email=user_data.email,
        name=user_data.user_metadata.get("full_name", payload.email.split("@")[0]),
        avatar_url=f"https://api.dicebear.com/7.x/bottts/svg?seed={user_data.email}"
      )
    )

  raise HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Email hoặc mật khẩu không chính xác."
  )

@router.post("/register", response_model=AuthTokenResponse)
async def register(payload: UserRegisterRequest):
  """
  Register user via Supabase Auth
  """
  res = await SupabaseService.register_user(payload.email, payload.password, payload.name)
  
  user_obj = getattr(res, "user", res) if res else None
  if user_obj and hasattr(user_obj, "id"):
    session_obj = getattr(res, "session", None)
    token = session_obj.access_token if session_obj and hasattr(session_obj, "access_token") else f"user_jwt_{uuid.uuid4().hex[:16]}"
    
    return AuthTokenResponse(
      access_token=token,
      user=UserResponse(
        id=user_obj.id,
        email=user_obj.email,
        name=payload.name,
        avatar_url=f"https://api.dicebear.com/7.x/bottts/svg?seed={payload.email}"
      )
    )

  raise HTTPException(
    status_code=status.HTTP_400_BAD_REQUEST,
    detail="Đăng ký thất bại. Email này có thể đã được đăng ký hoặc thông tin không hợp lệ."
  )



