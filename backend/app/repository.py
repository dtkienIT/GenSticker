from __future__ import annotations

from typing import Any, Protocol

from app.config import Settings
from app.pipeline import StickerPipeline


class Repository(Protocol):
    settings: Settings
    pipeline: StickerPipeline

    def initialize(self) -> None: ...

    def ready(self) -> bool: ...

    def create_source(
        self,
        *,
        owner_id: str,
        content: bytes,
        mime_type: str,
        consent_version: str,
    ) -> dict[str, Any]: ...

    def get_source(self, *, owner_id: str, source_id: str) -> dict[str, Any]: ...

    def create_job(
        self,
        *,
        owner_id: str,
        source_id: str,
        scenario: str,
        idempotency_key: str,
        style_id: str = "chibi_3d",
        locale: str = "vi",
        catalog_version: str = "v1",
        regenerated_from_job_id: str | None = None,
    ) -> tuple[dict[str, Any], bool]: ...

    def get_job(self, *, owner_id: str, job_id: str) -> dict[str, Any]: ...

    def list_jobs(self, *, owner_id: str, active_only: bool) -> list[dict[str, Any]]: ...

    def get_set(self, *, owner_id: str, set_id: str) -> dict[str, Any]: ...

    def save_set(
        self,
        *,
        owner_id: str,
        set_id: str,
        sticker_ids: list[str],
        idempotency_key: str,
    ) -> tuple[dict[str, Any], bool]: ...

    def list_packs(self, *, owner_id: str) -> list[dict[str, Any]]: ...

    def get_pack(self, *, owner_id: str, pack_id: str) -> dict[str, Any]: ...

    def delete_pack(self, *, owner_id: str, pack_id: str) -> None: ...

    def get_sticker_asset(self, *, owner_id: str, sticker_id: str) -> tuple[bytes, str, str]: ...
