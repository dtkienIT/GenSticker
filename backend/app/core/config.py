from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_ENV: str = "development"
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    DATABASE_URL: str = "sqlite:///./data/gensticker.db"
    ASSET_ROOT: str = "./data/assets"
    ASSET_STORE: str = "auto"  # "auto" | "local" | "supabase"

    # Supabase Configuration
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""
    SUPABASE_STORAGE_BUCKET: str = "gensticker-assets"

    # Storage & Image constraints
    MAX_UPLOAD_BYTES: int = 50 * 1024 * 1024  # 50 MB
    MIN_IMAGE_WIDTH: int = 160
    MIN_IMAGE_HEIGHT: int = 160
    MAX_IMAGE_WIDTH: int = 8192
    MAX_IMAGE_HEIGHT: int = 8192
    ASSET_TTL_HOURS: int = 168  # 7 days

    # Auth Seam
    DEV_AUTH_ENABLED: bool = True
    DEFAULT_DEV_USER_ID: str = "local-dev-user"

    # Single local pipeline: arbitrary image -> BiRefNet -> cartoon -> transparent PNG.
    STICKER_PROVIDER: str = "universal"
    BIREFNET_MODEL_PATH: str = "./models/birefnet"
    STICKER_DEVICE: str = "cpu"  # "cpu" | "cuda" | "auto"
    BIREFNET_INPUT_SIZE: int = 512
    STICKER_OUTPUT_SIZE: int = 512
    STICKER_INNER_SIZE: int = 438
    STICKER_OUTLINE_PX: int = 12
    STICKER_MASK_THRESHOLD: int = 28
    STICKER_CROP_PADDING_RATIO: float = 0.08
    STICKER_COLOR_CLUSTERS: int = 12
    STICKER_KMEANS_SEED: int = 7

    # Job Runner & Budgeting
    JOB_POLL_INTERVAL_MS: int = 500
    STALE_JOB_SECONDS: int = 120
    MAX_JOB_RETRIES: int = 2
    MAX_GPU_SECONDS_PER_JOB: int = 500
    GPU_COST_PER_SECOND_USD: float = 0.000075

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
