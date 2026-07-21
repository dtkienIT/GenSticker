from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_ENV: str = "development"
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    DATABASE_URL: str = "sqlite:///./data/gensticker.db"
    ASSET_ROOT: str = "./data/assets"

    # Supabase Configuration
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""
    SUPABASE_STORAGE_BUCKET: str = "gensticker-assets"

    # Replicate Configuration
    REPLICATE_API_TOKEN: str = ""

    # Storage & Image constraints
    MAX_UPLOAD_BYTES: int = 10 * 1024 * 1024  # 10 MB
    MIN_IMAGE_WIDTH: int = 256
    MIN_IMAGE_HEIGHT: int = 256
    MAX_IMAGE_WIDTH: int = 8192
    MAX_IMAGE_HEIGHT: int = 8192
    ASSET_TTL_HOURS: int = 168  # 7 days

    # Auth Seam
    DEV_AUTH_ENABLED: bool = True
    DEFAULT_DEV_USER_ID: str = "local-dev-user"

    # Generation Providers
    GENERATION_PROVIDER: str = "mock"  # "mock" | "comfyui"
    COMFYUI_ENABLED: bool = False
    COMFYUI_BASE_URL: str = "http://host.docker.internal:8188"

    # Job Runner & Budgeting
    JOB_POLL_INTERVAL_MS: int = 500
    STALE_JOB_SECONDS: int = 120
    MAX_JOB_RETRIES: int = 2
    MAX_GPU_SECONDS_PER_JOB: int = 500
    MOCK_COST_PER_SECOND_USD: float = 0.00019
    MOCK_GENERATION_DELAY_MS: int = 500

    LOG_LEVEL: str = "INFO"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def asset_root_path(self) -> Path:
        p = Path(self.ASSET_ROOT)
        p.mkdir(parents=True, exist_ok=True)
        return p.resolve()


settings = Settings()
