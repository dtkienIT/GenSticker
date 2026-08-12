import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load .env file from project root
load_dotenv()

class Settings(BaseSettings):
  APP_ENV: str = os.getenv("APP_ENV", "development")
  API_HOST: str = os.getenv("API_HOST", "127.0.0.1")
  API_PORT: int = int(os.getenv("API_PORT", "8000"))
  CORS_ORIGINS: str = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173",
  )
  ALLOW_LOCAL_DEMO_AUTH: bool = os.getenv("ALLOW_LOCAL_DEMO_AUTH", "false").lower() == "true"
  MAX_ACTIVE_GENERATIONS: int = int(os.getenv("MAX_ACTIVE_GENERATIONS", "2"))
  MAX_RETAINED_JOBS: int = int(os.getenv("MAX_RETAINED_JOBS", "4"))
  JOB_TTL_SECONDS: int = int(os.getenv("JOB_TTL_SECONDS", "86400"))
  JOB_STORAGE_ROOT: str = os.getenv("JOB_STORAGE_ROOT", "./data/jobs")
  RUN_GENERATION_INLINE: bool = os.getenv("RUN_GENERATION_INLINE", "false").lower() == "true"
  
  # Supabase & Database
  DATABASE_URL: str = os.getenv("DATABASE_URL", "")
  SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
  SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")
  SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
  SUPABASE_STORAGE_BUCKET: str = os.getenv("SUPABASE_STORAGE_BUCKET", "stickers")
  
  # Local storage fallback
  ASSET_ROOT: str = os.getenv("ASSET_ROOT", "./data/assets")

  # Image generation
  OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
  OPENAI_BASE_URL: str = os.getenv(
    "OPENAI_BASE_URL",
    "https://api.openai.com/v1",
  )
  OPENAI_IMAGE_MODEL: str = os.getenv("OPENAI_IMAGE_MODEL", "gpt-image-1.5")
  OPENAI_IMAGE_RESULT_DOMAINS: str = os.getenv("OPENAI_IMAGE_RESULT_DOMAINS", "")
  OPENAI_IMAGE_TIMEOUT_SECONDS: float = float(os.getenv("OPENAI_IMAGE_TIMEOUT_SECONDS", "300"))
  OPENAI_IMAGE_MAX_ATTEMPTS: int = int(os.getenv("OPENAI_IMAGE_MAX_ATTEMPTS", "2"))
  OPENAI_IMAGE_RETRY_BASE_DELAY_SECONDS: float = float(
    os.getenv("OPENAI_IMAGE_RETRY_BASE_DELAY_SECONDS", "2")
  )
  OPENAI_IMAGE_SHEET_CONCURRENCY: int = int(
    os.getenv("OPENAI_IMAGE_SHEET_CONCURRENCY", "1")
  )

  # Telegram Bot Credentials
  TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
  TELEGRAM_BOT_USERNAME: str = os.getenv("TELEGRAM_BOT_USERNAME", "GenStickerAIBot")

  class Config:
    env_file = ".env"
    extra = "ignore"

settings = Settings()
