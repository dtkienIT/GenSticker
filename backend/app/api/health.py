from fastapi import APIRouter
from app.config import settings
from app.database import supabase, engine

router = APIRouter()

@router.get("/health")
def health_check():
  return {
    "status": "healthy",
    "service": "GenSticker FastAPI Backend",
    "version": "1.0.0",
    "env": settings.APP_ENV,
    "supabase_connected": supabase is not None,
    "postgres_connected": engine is not None
  }
