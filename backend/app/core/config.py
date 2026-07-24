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

    # One-person research pipeline:
    # InsightFace -> InstantID + SDXL + face/hair ControlNets -> BiRefNet -> RGBA.
    STICKER_PROVIDER: str = "instantid"
    STICKER_DEVICE: str = "cuda"  # "cuda" | "auto"
    STICKER_SEGMENTER_DEVICE: str = "auto"  # "cpu" | "cuda" | "auto"
    INSTANTID_REPO_PATH: str = "./models/InstantID"
    SDXL_MODEL_PATH: str = "./models/sdxl-base"
    INSTANTID_MODEL_PATH: str = "./models/instantid"
    CANNY_CONTROLNET_MODEL_PATH: str = "./models/controlnet-canny-sdxl"
    INSIGHTFACE_MODEL_ROOT: str = "./models/insightface"
    CHIBI_LORA_PATH: str = "./models/lora/StickersRedmond.safetensors"
    BIREFNET_MODEL_PATH: str = "./models/birefnet"
    BIREFNET_INPUT_SIZE: int = 512
    STICKER_OUTPUT_SIZE: int = 1024
    STICKER_OUTLINE_PX: int = 15
    STICKER_MASK_THRESHOLD: int = 32
    STICKER_FACE_DETECTION_SIZE: int = 640
    STICKER_REFERENCE_CROP_SCALE: float = 2.35
    STICKER_CANNY_LOW_THRESHOLD: int = 60
    STICKER_CANNY_HIGH_THRESHOLD: int = 160
    STICKER_HAIR_DARK_THRESHOLD: int = 95
    STICKER_IP_ADAPTER_SCALE: float = 0.48
    STICKER_IDENTITY_CONTROL_SCALE: float = 0.45
    STICKER_HAIR_CONTROL_SCALE: float = 0.55
    STICKER_HAIR_CONTROL_END: float = 0.85
    STICKER_INFERENCE_STEPS: int = 30
    STICKER_GUIDANCE_SCALE: float = 4.8
    STICKER_LORA_SCALE: float = 1.25
    STICKER_TONE_TARGET_P95: float = 225.0
    STICKER_TONE_MIN_GAIN: float = 0.82
    STICKER_TONE_DESATURATION: float = 0.06

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
