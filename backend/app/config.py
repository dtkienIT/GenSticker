import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load .env file from project root
load_dotenv()

class Settings(BaseSettings):
  APP_ENV: str = os.getenv("APP_ENV", "development")
  API_HOST: str = os.getenv("API_HOST", "0.0.0.0")
  API_PORT: int = int(os.getenv("API_PORT", "8000"))
  
  # Supabase & Database
  DATABASE_URL: str = os.getenv("DATABASE_URL", "")
  SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
  SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")
  SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
  SUPABASE_STORAGE_BUCKET: str = os.getenv("SUPABASE_STORAGE_BUCKET", "stickers")
  
  # Local storage fallback
  ASSET_ROOT: str = os.getenv("ASSET_ROOT", "./data/assets")

  class Config:
    env_file = ".env"
    extra = "ignore"

settings = Settings()
