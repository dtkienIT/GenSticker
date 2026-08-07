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
  GENERATION_RATE_LIMIT_PER_HOUR: int = int(os.getenv("GENERATION_RATE_LIMIT_PER_HOUR", "3"))
  MAX_ACTIVE_GENERATIONS: int = int(os.getenv("MAX_ACTIVE_GENERATIONS", "2"))
  MAX_RETAINED_JOBS: int = int(os.getenv("MAX_RETAINED_JOBS", "4"))
  JOB_TTL_SECONDS: int = int(os.getenv("JOB_TTL_SECONDS", "3600"))
  
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
  OPENAI_IMAGE_MODEL: str = os.getenv("OPENAI_IMAGE_MODEL", "gpt-image-1.5")

  # Telegram Bot Credentials
  TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
  TELEGRAM_BOT_USERNAME: str = os.getenv("TELEGRAM_BOT_USERNAME", "GenStickerAIBot")

  class Config:
    env_file = ".env"
    extra = "ignore"

settings = Settings()
