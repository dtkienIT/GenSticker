from fastapi import APIRouter
from app.api.health import router as health_router
from app.api.auth import router as auth_router
from app.api.stickers import router as stickers_router
from app.api.telegram import router as telegram_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(stickers_router)
api_router.include_router(telegram_router)

