from __future__ import annotations

import hashlib
import os
import sqlite3
import uuid
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from typing import Any

from app.config import Settings
from app.domain import TERMINAL_JOB_STATUSES, iso_now
from app.errors import bad_request, conflict, not_found, unavailable
from app.pipeline import StickerPipeline

SCHEMA = """
CREATE TABLE IF NOT EXISTS source_images (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    storage_path TEXT NOT NULL UNIQUE,
    mime_type TEXT NOT NULL,
    byte_size INTEGER NOT NULL CHECK (byte_size > 0),
    checksum_sha256 TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('ready', 'rejected', 'deleted')),
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_source_images_owner_created
    ON source_images(owner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS consent_records (
    id TEXT PRIMARY KEY,
    source_image_id TEXT NOT NULL UNIQUE REFERENCES source_images(id) ON DELETE CASCADE,
    owner_id TEXT NOT NULL,
    consent_version TEXT NOT NULL,
    accepted_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS validation_results (
    id TEXT PRIMARY KEY,
    source_image_id TEXT NOT NULL REFERENCES source_images(id) ON DELETE CASCADE,
    owner_id TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('technical', 'subject', 'input_moderation')),
    status TEXT NOT NULL CHECK (status IN ('passed', 'failed', 'mocked')),
    safe_reason_code TEXT,
    provider_version TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(source_image_id, kind)
);

CREATE TABLE IF NOT EXISTS generation_jobs (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    source_image_id TEXT NOT NULL REFERENCES source_images(id),
    regenerated_from_job_id TEXT REFERENCES generation_jobs(id),
    status TEXT NOT NULL CHECK (
        status IN ('queued', 'generating', 'moderating', 'succeeded', 'failed', 'timed_out')
    ),
    stage TEXT NOT NULL,
    progress INTEGER NOT NULL CHECK (progress BETWEEN 0 AND 100),
    mock_scenario TEXT NOT NULL CHECK (
        mock_scenario IN ('success', 'failure', 'timeout', 'blocked')
    ),
    idempotency_key TEXT NOT NULL,
    request_hash TEXT NOT NULL,
    safe_error_code TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT,
    UNIQUE(owner_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_generation_jobs_owner_created
    ON generation_jobs(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_owner_status
    ON generation_jobs(owner_id, status);

CREATE TABLE IF NOT EXISTS sticker_sets (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    job_id TEXT NOT NULL UNIQUE REFERENCES generation_jobs(id) ON DELETE CASCADE,
    style TEXT NOT NULL CHECK (style = 'chibi_3d'),
    status TEXT NOT NULL CHECK (status IN ('preview', 'deleted')),
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sticker_variants (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    set_id TEXT NOT NULL REFERENCES sticker_sets(id) ON DELETE CASCADE,
    ordinal INTEGER NOT NULL CHECK (ordinal BETWEEN 1 AND 8),
    expression_key TEXT NOT NULL,
    storage_path TEXT NOT NULL UNIQUE,
    mime_type TEXT NOT NULL,
    moderation_status TEXT NOT NULL CHECK (moderation_status IN ('passed', 'blocked')),
    created_at TEXT NOT NULL,
    UNIQUE(set_id, ordinal)
);

CREATE INDEX IF NOT EXISTS idx_sticker_variants_owner_set
    ON sticker_variants(owner_id, set_id);

CREATE TABLE IF NOT EXISTS saved_packs (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    source_set_id TEXT NOT NULL REFERENCES sticker_sets(id),
    title TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    selection_hash TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(owner_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_saved_packs_owner_created
    ON saved_packs(owner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS saved_pack_items (
    pack_id TEXT NOT NULL REFERENCES saved_packs(id) ON DELETE CASCADE,
    sticker_id TEXT NOT NULL REFERENCES sticker_variants(id),
    ordinal INTEGER NOT NULL CHECK (ordinal BETWEEN 1 AND 8),
    PRIMARY KEY(pack_id, sticker_id),
    UNIQUE(pack_id, ordinal)
);
"""


class LocalRepository:
    def __init__(self, settings: Settings, pipeline: StickerPipeline) -> None:
        self.settings = settings
        self.pipeline = pipeline
        self.database_path = settings.resolved_database_path
        self.asset_root = settings.resolved_asset_root

    def initialize(self) -> None:
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        self.asset_root.mkdir(parents=True, exist_ok=True)
        with self._connection() as connection:
            connection.executescript(SCHEMA)

    def ready(self) -> bool:
        try:
            with self._connection() as connection:
                connection.execute("SELECT 1").fetchone()
            return self.asset_root.is_dir()
        except (OSError, sqlite3.Error):
            return False

    @contextmanager
    def _connection(self) -> Iterator[sqlite3.Connection]:
        connection = sqlite3.connect(self.database_path, timeout=10)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute("PRAGMA busy_timeout = 10000")
        try:
            yield connection
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()

    def _absolute_asset_path(self, relative_path: str) -> Path:
        root = self.asset_root.resolve()
        target = (root / relative_path).resolve()
        if target != root and root not in target.parents:
            raise unavailable("ASSET_PATH_INVALID", "Stored asset path is invalid.")
        return target

    def create_source(
        self,
        *,
        owner_id: str,
        content: bytes,
        mime_type: str,
        consent_version: str,
    ) -> dict[str, Any]:
        source_id = str(uuid.uuid4())
        relative_path = f"{owner_id}/sources/{source_id}.upload"
        asset_path = self._absolute_asset_path(relative_path)
        asset_path.parent.mkdir(parents=True, exist_ok=True)
        temp_path = asset_path.with_suffix(".tmp")
        temp_path.write_bytes(content)
        os.replace(temp_path, asset_path)
        now = iso_now()
        try:
            with self._connection() as connection:
                connection.execute(
                    """
                    INSERT INTO source_images
                        (id, owner_id, storage_path, mime_type, byte_size,
                         checksum_sha256, status, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, 'ready', ?)
                    """,
                    (
                        source_id,
                        owner_id,
                        relative_path,
                        mime_type,
                        len(content),
                        hashlib.sha256(content).hexdigest(),
                        now,
                    ),
                )
                connection.execute(
                    """
                    INSERT INTO consent_records
                        (id, source_image_id, owner_id, consent_version, accepted_at)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (str(uuid.uuid4()), source_id, owner_id, consent_version, now),
                )
                for kind, status in (
                    ("technical", "passed"),
                    ("subject", "mocked"),
                    ("input_moderation", "mocked"),
                ):
                    connection.execute(
                        """
                        INSERT INTO validation_results
                            (id, source_image_id, owner_id, kind, status,
                             safe_reason_code, provider_version, created_at)
                        VALUES (?, ?, ?, ?, ?, NULL, 'mock-v1', ?)
                        """,
                        (str(uuid.uuid4()), source_id, owner_id, kind, status, now),
                    )
        except Exception:
            asset_path.unlink(missing_ok=True)
            raise
        return self.get_source(owner_id=owner_id, source_id=source_id)

    def get_source(self, *, owner_id: str, source_id: str) -> dict[str, Any]:
        with self._connection() as connection:
            source = connection.execute(
                """
                SELECT s.id, s.mime_type, s.byte_size, s.status, s.created_at,
                       c.consent_version, c.accepted_at
                FROM source_images AS s
                JOIN consent_records AS c ON c.source_image_id = s.id
                WHERE s.id = ? AND s.owner_id = ? AND s.status <> 'deleted'
                """,
                (source_id, owner_id),
            ).fetchone()
            if source is None:
                raise not_found("Source image")
            validations = connection.execute(
                """
                SELECT kind, status, safe_reason_code, provider_version
                FROM validation_results
                WHERE source_image_id = ? AND owner_id = ?
                ORDER BY kind
                """,
                (source_id, owner_id),
            ).fetchall()
        result = dict(source)
        result["validation_results"] = [dict(row) for row in validations]
        result["pipeline_mode"] = self.pipeline.mode
        result["mocked"] = self.pipeline.is_mock
        return result

    def create_job(
        self,
        *,
        owner_id: str,
        source_id: str,
        scenario: str,
        idempotency_key: str,
        regenerated_from_job_id: str | None = None,
    ) -> tuple[dict[str, Any], bool]:
        request_hash = hashlib.sha256(
            f"{source_id}:{scenario}:{regenerated_from_job_id or ''}".encode()
        ).hexdigest()
        now = iso_now()
        job_id = str(uuid.uuid4())
        created = True
        with self._connection() as connection:
            connection.execute("BEGIN IMMEDIATE")
            existing = connection.execute(
                """
                SELECT * FROM generation_jobs
                WHERE owner_id = ? AND idempotency_key = ?
                """,
                (owner_id, idempotency_key),
            ).fetchone()
            if existing is not None:
                if existing["request_hash"] != request_hash:
                    raise conflict(
                        "IDEMPOTENCY_KEY_REUSED",
                        "The Idempotency-Key was already used for a different request.",
                    )
                job_id = existing["id"]
                created = False
            else:
                source = connection.execute(
                    """
                    SELECT s.id
                    FROM source_images AS s
                    JOIN consent_records AS c ON c.source_image_id = s.id
                    WHERE s.id = ? AND s.owner_id = ? AND s.status = 'ready'
                    """,
                    (source_id, owner_id),
                ).fetchone()
                if source is None:
                    raise bad_request(
                        "SOURCE_NOT_READY",
                        "The source must belong to the caller, include consent, and be ready.",
                    )
                if regenerated_from_job_id:
                    parent = connection.execute(
                        """
                        SELECT source_image_id, status
                        FROM generation_jobs
                        WHERE id = ? AND owner_id = ?
                        """,
                        (regenerated_from_job_id, owner_id),
                    ).fetchone()
                    if (
                        parent is None
                        or parent["source_image_id"] != source_id
                        or parent["status"] != "succeeded"
                    ):
                        raise bad_request(
                            "JOB_NOT_REGENERATABLE",
                            "Only a successful owned job can be regenerated.",
                        )
                connection.execute(
                    """
                    INSERT INTO generation_jobs
                        (id, owner_id, source_image_id, regenerated_from_job_id,
                         status, stage, progress, mock_scenario, idempotency_key,
                         request_hash, safe_error_code, created_at, updated_at,
                         completed_at)
                    VALUES (?, ?, ?, ?, 'queued', 'queued', 5, ?, ?, ?, NULL, ?, ?, NULL)
                    """,
                    (
                        job_id,
                        owner_id,
                        source_id,
                        regenerated_from_job_id,
                        scenario,
                        idempotency_key,
                        request_hash,
                        now,
                        now,
                    ),
                )
        return self.get_job(owner_id=owner_id, job_id=job_id), created

    def _load_job(self, *, owner_id: str, job_id: str) -> dict[str, Any]:
        with self._connection() as connection:
            row = connection.execute(
                """
                SELECT j.*,
                       (SELECT id FROM sticker_sets WHERE job_id = j.id) AS sticker_set_id
                FROM generation_jobs AS j
                WHERE j.id = ? AND j.owner_id = ?
                """,
                (job_id, owner_id),
            ).fetchone()
        if row is None:
            raise not_found("Generation job")
        result = dict(row)
        result["pipeline_mode"] = self.pipeline.mode
        result["mocked"] = self.pipeline.is_mock
        return result

    def get_job(self, *, owner_id: str, job_id: str) -> dict[str, Any]:
        job = self._load_job(owner_id=owner_id, job_id=job_id)
        if job["status"] not in TERMINAL_JOB_STATUSES:
            snapshot = self.pipeline.snapshot(
                created_at=job["created_at"], scenario=job["mock_scenario"]
            )
            if snapshot.status.value == "succeeded":
                self._complete_job(owner_id=owner_id, job_id=job_id)
            else:
                completed_at = (
                    iso_now() if snapshot.status.value in TERMINAL_JOB_STATUSES else None
                )
                with self._connection() as connection:
                    connection.execute(
                        """
                        UPDATE generation_jobs
                        SET status = ?, stage = ?, progress = ?, safe_error_code = ?,
                            updated_at = ?, completed_at = ?
                        WHERE id = ? AND owner_id = ?
                          AND status NOT IN ('succeeded', 'failed', 'timed_out')
                        """,
                        (
                            snapshot.status.value,
                            snapshot.stage,
                            snapshot.progress,
                            snapshot.safe_error_code,
                            iso_now(),
                            completed_at,
                            job_id,
                            owner_id,
                        ),
                    )
            job = self._load_job(owner_id=owner_id, job_id=job_id)
        return job

    def _complete_job(self, *, owner_id: str, job_id: str) -> None:
        created_assets: list[Path] = []
        with self._connection() as connection:
            connection.execute("BEGIN IMMEDIATE")
            job = connection.execute(
                "SELECT * FROM generation_jobs WHERE id = ? AND owner_id = ?",
                (job_id, owner_id),
            ).fetchone()
            if job is None:
                raise not_found("Generation job")
            if job["status"] in TERMINAL_JOB_STATUSES:
                return
            set_id = str(uuid.uuid4())
            now = iso_now()
            variants: list[tuple[str, int, str]] = []
            try:
                for ordinal in range(1, self.pipeline.output_count + 1):
                    sticker_id = str(uuid.uuid4())
                    relative_path = (
                        f"{owner_id}/outputs/{set_id}/{ordinal}-{sticker_id}.svg"
                    )
                    asset_path = self._absolute_asset_path(relative_path)
                    asset_path.parent.mkdir(parents=True, exist_ok=True)
                    temp_path = asset_path.with_suffix(".tmp")
                    temp_path.write_bytes(
                        self.pipeline.render_placeholder(ordinal=ordinal, job_id=job_id)
                    )
                    os.replace(temp_path, asset_path)
                    created_assets.append(asset_path)
                    variants.append((sticker_id, ordinal, relative_path))

                connection.execute(
                    """
                    INSERT INTO sticker_sets (id, owner_id, job_id, style, status, created_at)
                    VALUES (?, ?, ?, 'chibi_3d', 'preview', ?)
                    """,
                    (set_id, owner_id, job_id, now),
                )
                for sticker_id, ordinal, relative_path in variants:
                    connection.execute(
                        """
                        INSERT INTO sticker_variants
                            (id, owner_id, set_id, ordinal, expression_key,
                             storage_path, mime_type, moderation_status, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, 'image/svg+xml', 'passed', ?)
                        """,
                        (
                            sticker_id,
                            owner_id,
                            set_id,
                            ordinal,
                            f"demo_slot_{ordinal}",
                            relative_path,
                            now,
                        ),
                    )
                connection.execute(
                    """
                    UPDATE generation_jobs
                    SET status = 'succeeded', stage = 'ready', progress = 100,
                        safe_error_code = NULL, updated_at = ?, completed_at = ?
                    WHERE id = ? AND owner_id = ?
                    """,
                    (now, now, job_id, owner_id),
                )
            except Exception:
                for path in created_assets:
                    path.unlink(missing_ok=True)
                raise

    def list_jobs(self, *, owner_id: str, active_only: bool) -> list[dict[str, Any]]:
        query = """
            SELECT j.*,
                   (SELECT id FROM sticker_sets WHERE job_id = j.id) AS sticker_set_id
            FROM generation_jobs AS j
            WHERE j.owner_id = ?
        """
        parameters: list[Any] = [owner_id]
        if active_only:
            query += " AND j.status NOT IN ('succeeded', 'failed', 'timed_out')"
        query += " ORDER BY j.created_at DESC LIMIT 100"
        with self._connection() as connection:
            job_ids = [
                row["id"] for row in connection.execute(query, parameters).fetchall()
            ]
        return [self.get_job(owner_id=owner_id, job_id=job_id) for job_id in job_ids]

    def get_set(self, *, owner_id: str, set_id: str) -> dict[str, Any]:
        with self._connection() as connection:
            sticker_set = connection.execute(
                """
                SELECT id, job_id, style, status, created_at
                FROM sticker_sets
                WHERE id = ? AND owner_id = ? AND status = 'preview'
                """,
                (set_id, owner_id),
            ).fetchone()
            if sticker_set is None:
                raise not_found("Sticker set")
            variants = connection.execute(
                """
                SELECT id, ordinal, expression_key, mime_type,
                       moderation_status, created_at
                FROM sticker_variants
                WHERE set_id = ? AND owner_id = ? AND moderation_status = 'passed'
                ORDER BY ordinal
                """,
                (set_id, owner_id),
            ).fetchall()
        if len(variants) != self.pipeline.output_count:
            raise unavailable(
                "STICKER_SET_INCOMPLETE",
                "The sticker set is not ready for preview.",
            )
        result = dict(sticker_set)
        result["mocked"] = self.pipeline.is_mock
        result["stickers"] = [dict(row) for row in variants]
        return result

    def save_set(
        self,
        *,
        owner_id: str,
        set_id: str,
        sticker_ids: list[str],
        idempotency_key: str,
    ) -> tuple[dict[str, Any], bool]:
        unique_ids = sorted(set(sticker_ids))
        if len(unique_ids) != len(sticker_ids):
            raise bad_request(
                "DUPLICATE_STICKER_SELECTION",
                "Each selected sticker may appear only once.",
            )
        selection_hash = hashlib.sha256(
            f"{set_id}:{','.join(unique_ids)}".encode()
        ).hexdigest()
        pack_id = str(uuid.uuid4())
        now = iso_now()
        created = True
        with self._connection() as connection:
            connection.execute("BEGIN IMMEDIATE")
            existing = connection.execute(
                "SELECT * FROM saved_packs WHERE owner_id = ? AND idempotency_key = ?",
                (owner_id, idempotency_key),
            ).fetchone()
            if existing is not None:
                if existing["selection_hash"] != selection_hash:
                    raise conflict(
                        "IDEMPOTENCY_KEY_REUSED",
                        "The Idempotency-Key was already used for a different selection.",
                    )
                pack_id = existing["id"]
                created = False
            else:
                sticker_set = connection.execute(
                    """
                    SELECT id FROM sticker_sets
                    WHERE id = ? AND owner_id = ? AND status = 'preview'
                    """,
                    (set_id, owner_id),
                ).fetchone()
                if sticker_set is None:
                    raise not_found("Sticker set")
                placeholders = ",".join("?" for _ in unique_ids)
                selected = connection.execute(
                    f"""
                    SELECT id, ordinal
                    FROM sticker_variants
                    WHERE set_id = ? AND owner_id = ?
                      AND moderation_status = 'passed'
                      AND id IN ({placeholders})
                    ORDER BY ordinal
                    """,
                    [set_id, owner_id, *unique_ids],
                ).fetchall()
                if len(selected) != len(unique_ids):
                    raise bad_request(
                        "INVALID_STICKER_SELECTION",
                        "All selected stickers must be moderated items in this set.",
                    )
                connection.execute(
                    """
                    INSERT INTO saved_packs
                        (id, owner_id, source_set_id, title, idempotency_key,
                         selection_hash, created_at)
                    VALUES (?, ?, ?, 'Mock Sticker Pack', ?, ?, ?)
                    """,
                    (pack_id, owner_id, set_id, idempotency_key, selection_hash, now),
                )
                for position, row in enumerate(selected, start=1):
                    connection.execute(
                        """
                        INSERT INTO saved_pack_items (pack_id, sticker_id, ordinal)
                        VALUES (?, ?, ?)
                        """,
                        (pack_id, row["id"], position),
                    )
        return self.get_pack(owner_id=owner_id, pack_id=pack_id), created

    def list_packs(self, *, owner_id: str) -> list[dict[str, Any]]:
        with self._connection() as connection:
            pack_ids = [
                row["id"]
                for row in connection.execute(
                    """
                    SELECT id FROM saved_packs
                    WHERE owner_id = ? ORDER BY created_at DESC
                    """,
                    (owner_id,),
                ).fetchall()
            ]
        return [self.get_pack(owner_id=owner_id, pack_id=pack_id) for pack_id in pack_ids]

    def get_pack(self, *, owner_id: str, pack_id: str) -> dict[str, Any]:
        with self._connection() as connection:
            pack = connection.execute(
                """
                SELECT id, source_set_id, title, created_at
                FROM saved_packs WHERE id = ? AND owner_id = ?
                """,
                (pack_id, owner_id),
            ).fetchone()
            if pack is None:
                raise not_found("Saved pack")
            items = connection.execute(
                """
                SELECT v.id, i.ordinal AS saved_ordinal, v.ordinal AS source_ordinal,
                       v.expression_key, v.mime_type, v.moderation_status, v.created_at
                FROM saved_pack_items AS i
                JOIN sticker_variants AS v ON v.id = i.sticker_id
                WHERE i.pack_id = ? AND v.owner_id = ?
                  AND v.moderation_status = 'passed'
                ORDER BY i.ordinal
                """,
                (pack_id, owner_id),
            ).fetchall()
        result = dict(pack)
        result["stickers"] = [dict(row) for row in items]
        return result

    def delete_pack(self, *, owner_id: str, pack_id: str) -> None:
        with self._connection() as connection:
            cursor = connection.execute(
                "DELETE FROM saved_packs WHERE id = ? AND owner_id = ?",
                (pack_id, owner_id),
            )
            if cursor.rowcount == 0:
                raise not_found("Saved pack")

    def get_sticker_asset(
        self, *, owner_id: str, sticker_id: str
    ) -> tuple[bytes, str, str]:
        with self._connection() as connection:
            sticker = connection.execute(
                """
                SELECT storage_path, mime_type, ordinal
                FROM sticker_variants
                WHERE id = ? AND owner_id = ? AND moderation_status = 'passed'
                """,
                (sticker_id, owner_id),
            ).fetchone()
        if sticker is None:
            raise not_found("Sticker")
        path = self._absolute_asset_path(sticker["storage_path"])
        try:
            content = path.read_bytes()
        except OSError:
            raise unavailable("ASSET_UNAVAILABLE", "The sticker asset is unavailable.") from None
        return content, sticker["mime_type"], f"sticker-{sticker['ordinal']}.svg"
