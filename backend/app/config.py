from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[1]
REPOSITORY_ROOT = BACKEND_ROOT.parent


class Settings(BaseSettings):
    """Runtime settings.

    Backend and mobile share the repository-level ``.env``. Expo only exposes
    variables with the ``EXPO_PUBLIC_`` prefix to the application bundle.
    """

    model_config = SettingsConfigDict(
        env_file=REPOSITORY_ROOT / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "Duhat Gen Sticker API"
    app_env: str = "development"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: str = "*"

    data_backend: str = "local"
    pipeline_backend: str = "mock"
    local_database_path: Path = Path("data/gensticker.sqlite3")
    local_asset_root: Path = Path("storage")
    allow_local_demo_auth: bool = True
    mock_stage_seconds: float = Field(default=0.6, ge=0.0, le=60.0)
    max_upload_bytes: int = Field(default=10 * 1024 * 1024, ge=1)

    supabase_url: str | None = None
    supabase_service_role_key: str | None = None
    supabase_jwt_audience: str = "authenticated"
    supabase_jwt_secret: str | None = None
    supabase_storage_bucket_source: str = "source-images"
    supabase_storage_bucket_output: str = "generated-stickers"

    @field_validator("app_env")
    @classmethod
    def validate_app_env(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in {"development", "test", "production"}:
            raise ValueError("APP_ENV must be development, test, or production")
        return normalized

    @field_validator("data_backend")
    @classmethod
    def validate_backend(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in {"local", "supabase"}:
            raise ValueError("DATA_BACKEND must be local or supabase")
        return normalized

    @field_validator("pipeline_backend")
    @classmethod
    def validate_pipeline_backend(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized != "mock":
            raise ValueError(
                "PIPELINE_BACKEND currently supports only mock; no real adapter is implemented"
            )
        return normalized

    @property
    def resolved_database_path(self) -> Path:
        path = self.local_database_path.expanduser()
        return path if path.is_absolute() else BACKEND_ROOT / path

    @property
    def resolved_asset_root(self) -> Path:
        path = self.local_asset_root.expanduser()
        return path if path.is_absolute() else BACKEND_ROOT / path

    @property
    def cors_origin_list(self) -> list[str]:
        values = [item.strip() for item in self.cors_origins.split(",")]
        return [item for item in values if item] or ["*"]

    @property
    def mock_scenarios_enabled(self) -> bool:
        return self.app_env in {"development", "test"}

    def assert_supabase_configuration(self) -> None:
        if self.data_backend != "supabase":
            return
        missing = []
        if not self.supabase_url:
            missing.append("SUPABASE_URL")
        if not self.supabase_service_role_key:
            missing.append("SUPABASE_SERVICE_ROLE_KEY")
        if missing:
            raise RuntimeError(f"Missing required Supabase settings: {', '.join(missing)}")

    def assert_runtime_safety(self) -> None:
        if self.app_env == "production" and self.pipeline_backend == "mock":
            raise RuntimeError(
                "Refusing to start production with PIPELINE_BACKEND=mock. "
                "A reviewed real pipeline adapter is required."
            )


@lru_cache
def get_settings() -> Settings:
    return Settings()
