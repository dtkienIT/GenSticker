from app.models.schemas import (
  AuthTokenResponse,
  UserLoginRequest,
  UserRegisterRequest,
  UserResponse,
)
from app.services.supabase_service import SupabaseService
from fastapi import APIRouter, HTTPException, status

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
    if not session_obj or not getattr(session_obj, "access_token", None):
      raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Không thể tạo phiên đăng nhập hợp lệ. Vui lòng thử lại."
      )
    token = session_obj.access_token
    
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
  # Validate email format on server side
  import re
  email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
  if not re.match(email_regex, payload.email):
    raise HTTPException(
      status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
      detail="Email không đúng định dạng. Vui lòng kiểm tra lại."
    )

  try:
    res = await SupabaseService.register_user(payload.email, payload.password, payload.name)
  except ValueError as ve:
    raise HTTPException(
      status_code=status.HTTP_409_CONFLICT,
      detail=str(ve)
    )

  user_obj = getattr(res, "user", res) if res else None
  if user_obj and hasattr(user_obj, "id"):
    session_obj = getattr(res, "session", None)
    if not session_obj or not getattr(session_obj, "access_token", None):
      login_res = await SupabaseService.authenticate_user(payload.email, payload.password)
      if login_res and getattr(login_res, "user", None) and getattr(login_res, "session", None):
        user_obj = login_res.user
        session_obj = login_res.session

    if not session_obj or not getattr(session_obj, "access_token", None):
      raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Tài khoản đã được tạo nhưng chưa thể đăng nhập tự động. Vui lòng đăng nhập lại."
      )
    token = session_obj.access_token
    
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
    detail="Đăng ký thất bại. Vui lòng thử lại."
  )
