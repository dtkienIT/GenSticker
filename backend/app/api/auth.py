from fastapi import APIRouter, HTTPException, status
from app.models.schemas import UserLoginRequest, UserRegisterRequest, AuthTokenResponse, UserResponse
from app.services.supabase_service import SupabaseService
import uuid

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=AuthTokenResponse)
async def login(payload: UserLoginRequest):
  """
  Login user via Supabase Auth or mock fallback
  """
  # Try Supabase Auth
  res = await SupabaseService.authenticate_user(payload.email, payload.password)
  
  if res and hasattr(res, "user") and res.user:
    user_data = res.user
    token = res.session.access_token if res.session else "mock_jwt_token"
    
    return AuthTokenResponse(
      access_token=token,
      user=UserResponse(
        id=user_data.id,
        email=user_data.email,
        name=user_data.user_metadata.get("full_name", payload.email.split("@")[0]),
        avatar_url=f"https://api.dicebear.com/7.x/bottts/svg?seed={user_data.email}"
      )
    )

  # Fallback for dev / mock testing
  mock_name = payload.email.split("@")[0].capitalize()
  return AuthTokenResponse(
    access_token=f"mock_token_{uuid.uuid4().hex[:12]}",
    user=UserResponse(
      id=f"usr_{uuid.uuid4().hex[:8]}",
      email=payload.email,
      name=mock_name,
      avatar_url=f"https://api.dicebear.com/7.x/bottts/svg?seed={payload.email}"
    )
  )

@router.post("/register", response_model=AuthTokenResponse)
async def register(payload: UserRegisterRequest):
  """
  Register user via Supabase Auth
  """
  res = await SupabaseService.register_user(payload.email, payload.password, payload.name)
  
  if res and hasattr(res, "user") and res.user:
    user_data = res.user
    token = res.session.access_token if res.session else f"mock_token_{uuid.uuid4().hex[:12]}"
    
    return AuthTokenResponse(
      access_token=token,
      user=UserResponse(
        id=user_data.id,
        email=user_data.email,
        name=payload.name,
        avatar_url=f"https://api.dicebear.com/7.x/bottts/svg?seed={payload.email}"
      )
    )

  return AuthTokenResponse(
    access_token=f"mock_token_{uuid.uuid4().hex[:12]}",
    user=UserResponse(
      id=f"usr_{uuid.uuid4().hex[:8]}",
      email=payload.email,
      name=payload.name,
      avatar_url=f"https://api.dicebear.com/7.x/bottts/svg?seed={payload.email}"
    )
  )
