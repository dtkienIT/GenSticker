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

# Enable CORS for React Frontend (localhost:5173 / localhost:3000 / Mobile dev)
app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
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

