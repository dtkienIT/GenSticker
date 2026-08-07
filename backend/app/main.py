from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api.router import api_router

app = FastAPI(
  title="GenSticker AI Backend API",
  description="API Gateway & AI Generation Pipeline for GenSticker Web & Mobile",
  version="1.0.0",
  docs_url="/docs",
  redoc_url="/redoc"
)

# Restrict browser access to explicitly configured frontend origins.
app.add_middleware(
  CORSMiddleware,
  allow_origins=[origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()],
  allow_credentials=False,
  allow_methods=["GET", "POST", "OPTIONS"],
  allow_headers=["Authorization", "Content-Type"],
)

# Mount API router under /api/v1
app.include_router(api_router)

@app.on_event("startup")
async def startup_event():
  """Start Telegram Bot polling on app startup."""
  if settings.TELEGRAM_BOT_TOKEN:
    from app.services.telegram_bot import TelegramBot
    await TelegramBot.ensure_polling_started()

@app.get("/")
def root():
  return {
    "message": "Welcome to GenSticker AI Backend API",
    "docs": "/docs",
    "health": "/api/v1/health"
  }

