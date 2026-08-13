from __future__ import annotations

import hashlib
import uuid
from dataclasses import dataclass
from typing import Any, NoReturn

from supabase import Client, create_client

from app.config import Settings
from app.domain import TERMINAL_JOB_STATUSES, iso_now
from app.errors import bad_request, conflict, not_found, unavailable
from app.pipeline import StickerPipeline


@dataclass(frozen=True, slots=True)
class CompletionReconciliation:
    committed_set_id: str | None = None
    candidate_committed: bool = False
    candidate_proven_uncommitted: bool = False


@dataclass(frozen=True, slots=True)
class SourceReconciliation:
    metadata_checked: bool = False
    metadata_complete: bool = False
    object_exists: bool | None = None

    @property
    def committed(self) -> bool:
        return self.metadata_complete and self.object_exists is True

    @property
    def proven_uncommitted_before_rpc(self) -> bool:
        return self.metadata_checked and not self.metadata_complete


class SupabaseRepository:
    """Service-role Supabase adapter.

    The service role bypasses RLS, so every resource lookup still carries an
    explicit ``owner_id`` filter. The mobile service-role key is never exposed.
    """

    def __init__(self, settings: Settings, pipeline: StickerPipeline) -> None:
        settings.assert_supabase_configuration()
        self.settings = settings
        self.pipeline = pipeline
        self.client: Client = create_client(
            settings.supabase_url or "",
            settings.supabase_service_role_key or "",
        )

    def initialize(self) -> None:
        # Schema changes are intentionally migration-driven, not performed by app startup.
        if not self.ready():
            raise RuntimeError(
                "Supabase is not ready. Apply supabase/migrations/001_mvp.sql first."
            )

    def ready(self) -> bool:
        try:
            required_contract = (
                ("source_images", "id,subject_type,expires_at"),
                ("generation_jobs", "id,style_id,locale,catalog_version"),
                (
                    "sticker_sets",
                    "id,target_count,published_count,rejected_count,subject_type,locale,catalog_version",
                ),
            )
            for table, columns in required_contract:
                self.client.table(table).select(columns).limit(1).execute()
            return True
        except Exception:
            return False

    @staticmethod
    def _one(data: list[dict[str, Any]] | None, resource: str) -> dict[str, Any]:
        if not data:
            raise not_found(resource)
        return data[0]

    def create_source(
        self,
        *,
        owner_id: str,
        content: bytes,
        mime_type: str,
        consent_version: str,
    ) -> dict[str, Any]:
        source_id = str(uuid.uuid4())
        storage_path = f"{owner_id}/{source_id}.upload"
        checksum = hashlib.sha256(content).hexdigest()
        bucket = self.client.storage.from_(self.settings.supabase_storage_bucket_source)
        try:
            bucket.upload(
                storage_path,
                content,
                {"content-type": mime_type, "upsert": "false"},
            )
        except Exception:
            reconciliation = self._reconcile_source(
                owner_id=owner_id,
                source_id=source_id,
                storage_path=storage_path,
                mime_type=mime_type,
                byte_size=len(content),
                checksum=checksum,
                consent_version=consent_version,
                bucket=bucket,
            )
            if reconciliation.committed:
                return self.get_source(owner_id=owner_id, source_id=source_id)
            if reconciliation.proven_uncommitted_before_rpc:
                self._remove_uploaded_paths(bucket=bucket, paths=[storage_path])
            raise

        try:
            self.client.rpc(
                "create_mock_source",
                {
                    "p_source_id": source_id,
                    "p_owner_id": owner_id,
                    "p_storage_path": storage_path,
                    "p_mime_type": mime_type,
                    "p_byte_size": len(content),
                    "p_checksum_sha256": checksum,
                    "p_consent_version": consent_version,
                },
            ).execute()
        except Exception as rpc_error:
            reconciliation = self._reconcile_source(
                owner_id=owner_id,
                source_id=source_id,
                storage_path=storage_path,
                mime_type=mime_type,
                byte_size=len(content),
                checksum=checksum,
                consent_version=consent_version,
                bucket=bucket,
            )
            if reconciliation.committed:
                return self.get_source(owner_id=owner_id, source_id=source_id)
            if self._provider_error_code(rpc_error) in {"23505"}:
                self._cleanup_source_candidate(
                    owner_id=owner_id,
                    source_id=source_id,
                    storage_path=storage_path,
                    bucket=bucket,
                    delete_object=reconciliation.object_exists is True,
                )
            raise
        return self.get_source(owner_id=owner_id, source_id=source_id)

    def _reconcile_source(
        self,
        *,
        owner_id: str,
        source_id: str,
        storage_path: str,
        mime_type: str,
        byte_size: int,
        checksum: str,
        consent_version: str,
        bucket: Any,
    ) -> SourceReconciliation:
        """Verify the complete DB transaction and corresponding private object."""

        try:
            sources = (
                self.client.table("source_images")
                .select("storage_path,mime_type,byte_size,checksum_sha256,status")
                .eq("id", source_id)
                .eq("owner_id", owner_id)
                .limit(1)
                .execute()
                .data
                or []
            )
            consents = (
                self.client.table("consent_records")
                .select("consent_version")
                .eq("source_image_id", source_id)
                .eq("owner_id", owner_id)
                .limit(1)
                .execute()
                .data
                or []
            )
            validations = (
                self.client.table("validation_results")
                .select("kind,status")
                .eq("source_image_id", source_id)
                .eq("owner_id", owner_id)
                .execute()
                .data
                or []
            )
            expected_validation = {
                ("technical", "passed"),
                ("subject", "mocked"),
                ("input_moderation", "mocked"),
            }
            source = sources[0] if sources else {}
            metadata_complete = bool(
                source.get("storage_path") == storage_path
                and source.get("mime_type") == mime_type
                and int(source.get("byte_size", -1)) == byte_size
                and source.get("checksum_sha256") == checksum
                and source.get("status") == "ready"
                and consents
                and consents[0].get("consent_version") == consent_version
                and {(row.get("kind"), row.get("status")) for row in validations}
                == expected_validation
            )
        except Exception:
            return SourceReconciliation()
        try:
            object_exists: bool | None = bool(bucket.exists(storage_path))
        except Exception:
            object_exists = None
        return SourceReconciliation(
            metadata_checked=True,
            metadata_complete=metadata_complete,
            object_exists=object_exists,
        )

    def _cleanup_source_candidate(
        self,
        *,
        owner_id: str,
        source_id: str,
        storage_path: str,
        bucket: Any,
        delete_object: bool,
    ) -> None:
        # Delete metadata first. If that cannot be confirmed, retain the object
        # rather than risk breaking committed metadata.
        try:
            self.client.table("source_images").delete().eq("id", source_id).eq(
                "owner_id", owner_id
            ).execute()
        except Exception:
            pass
        if delete_object:
            self._remove_uploaded_paths(bucket=bucket, paths=[storage_path])

    def get_source(self, *, owner_id: str, source_id: str) -> dict[str, Any]:
        source = self._one(
            self.client.table("source_images")
            .select("id,mime_type,byte_size,status,subject_type,expires_at,created_at")
            .eq("id", source_id)
            .eq("owner_id", owner_id)
            .neq("status", "deleted")
            .limit(1)
            .execute()
            .data,
            "Source image",
        )
        consent = self._one(
            self.client.table("consent_records")
            .select("consent_version,accepted_at")
            .eq("source_image_id", source_id)
            .eq("owner_id", owner_id)
            .limit(1)
            .execute()
            .data,
            "Source consent",
        )
        validations = (
            self.client.table("validation_results")
            .select("kind,status,safe_reason_code,provider_version")
            .eq("source_image_id", source_id)
            .eq("owner_id", owner_id)
            .order("kind")
            .execute()
            .data
            or []
        )
        return {
            **source,
            **consent,
            "validation_results": validations,
            "pipeline_mode": self.pipeline.mode,
            "mocked": self.pipeline.is_mock,
        }

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
    ) -> tuple[dict[str, Any], bool]:
        request_hash = hashlib.sha256(
            (
                f"{source_id}:{scenario}:{style_id}:{locale}:{catalog_version}:"
                f"{regenerated_from_job_id or ''}"
            ).encode()
        ).hexdigest()
        existing = (
            self.client.table("generation_jobs")
            .select("*")
            .eq("owner_id", owner_id)
            .eq("idempotency_key", idempotency_key)
            .limit(1)
            .execute()
            .data
            or []
        )
        if existing:
            if existing[0]["request_hash"] != request_hash:
                raise conflict(
                    "IDEMPOTENCY_KEY_REUSED",
                    "The Idempotency-Key was already used for a different request.",
                )
            return self.get_job(owner_id=owner_id, job_id=existing[0]["id"]), False

        source = (
            self.client.table("source_images")
            .select("id")
            .eq("id", source_id)
            .eq("owner_id", owner_id)
            .eq("status", "ready")
            .gt("expires_at", iso_now())
            .limit(1)
            .execute()
            .data
            or []
        )
        consent = (
            self.client.table("consent_records")
            .select("id")
            .eq("source_image_id", source_id)
            .eq("owner_id", owner_id)
            .limit(1)
            .execute()
            .data
            or []
        )
        if not source or not consent:
            raise bad_request(
                "SOURCE_NOT_READY",
                "The source must belong to the caller, include consent, and be ready.",
            )
        if regenerated_from_job_id:
            regenerated = (
                self.client.table("generation_jobs")
                .select("id", count="exact")
                .eq("owner_id", owner_id)
                .eq("source_image_id", source_id)
                .not_.is_("regenerated_from_job_id", "null")
                .execute()
            )
            if (regenerated.count or 0) >= self.settings.max_regenerations_per_source:
                raise bad_request(
                    "REGENERATION_QUOTA_EXCEEDED", "This source has reached its regeneration limit."
                )
            parent = (
                self.client.table("generation_jobs")
                .select("source_image_id,status")
                .eq("id", regenerated_from_job_id)
                .eq("owner_id", owner_id)
                .limit(1)
                .execute()
                .data
                or []
            )
            if (
                not parent
                or parent[0]["source_image_id"] != source_id
                or parent[0]["status"] != "succeeded"
            ):
                raise bad_request(
                    "JOB_NOT_REGENERATABLE",
                    "Only a successful owned job can be regenerated.",
                )

        now = iso_now()
        payload = {
            "id": str(uuid.uuid4()),
            "owner_id": owner_id,
            "source_image_id": source_id,
            "regenerated_from_job_id": regenerated_from_job_id,
            "status": "queued",
            "stage": "queued",
            "progress": 5,
            "mock_scenario": scenario,
            "style_id": style_id,
            "locale": locale,
            "catalog_version": catalog_version,
            "idempotency_key": idempotency_key,
            "request_hash": request_hash,
            "created_at": now,
            "updated_at": now,
        }
        try:
            self.client.table("generation_jobs").insert(payload).execute()
        except Exception:
            # Resolve an idempotency race without exposing database details.
            raced = (
                self.client.table("generation_jobs")
                .select("id,request_hash")
                .eq("owner_id", owner_id)
                .eq("idempotency_key", idempotency_key)
                .limit(1)
                .execute()
                .data
                or []
            )
            if not raced or raced[0]["request_hash"] != request_hash:
                raise
            return self.get_job(owner_id=owner_id, job_id=raced[0]["id"]), False
        return self.get_job(owner_id=owner_id, job_id=payload["id"]), True

    def _load_job(self, *, owner_id: str, job_id: str) -> dict[str, Any]:
        job = self._one(
            self.client.table("generation_jobs")
            .select("*")
            .eq("id", job_id)
            .eq("owner_id", owner_id)
            .limit(1)
            .execute()
            .data,
            "Generation job",
        )
        sticker_set = (
            self.client.table("sticker_sets")
            .select("id")
            .eq("job_id", job_id)
            .eq("owner_id", owner_id)
            .limit(1)
            .execute()
            .data
            or []
        )
        job["sticker_set_id"] = sticker_set[0]["id"] if sticker_set else None
        job["pipeline_mode"] = self.pipeline.mode
        job["mocked"] = self.pipeline.is_mock
        return job

    def get_job(self, *, owner_id: str, job_id: str) -> dict[str, Any]:
        job = self._load_job(owner_id=owner_id, job_id=job_id)
        if job["status"] in TERMINAL_JOB_STATUSES:
            return job
        snapshot = self.pipeline.snapshot(
            created_at=job["created_at"], scenario=job["mock_scenario"]
        )
        if snapshot.status.value == "succeeded":
            self._complete_job(owner_id=owner_id, job_id=job_id, scenario=job["mock_scenario"])
        else:
            now = iso_now()
            payload: dict[str, Any] = {
                "status": snapshot.status.value,
                "stage": snapshot.stage,
                "progress": snapshot.progress,
                "safe_error_code": snapshot.safe_error_code,
                "updated_at": now,
            }
            if snapshot.status.value in TERMINAL_JOB_STATUSES:
                payload["completed_at"] = now
            (
                self.client.table("generation_jobs")
                .update(payload)
                .eq("id", job_id)
                .eq("owner_id", owner_id)
                .not_.in_("status", list(TERMINAL_JOB_STATUSES))
                .execute()
            )
        return self._load_job(owner_id=owner_id, job_id=job_id)

    def _complete_job(self, *, owner_id: str, job_id: str, scenario: str = "success") -> str:
        set_id = str(uuid.uuid4())
        now = iso_now()
        variants: list[dict[str, Any]] = []
        uploaded_paths: list[str] = []
        bucket = self.client.storage.from_(self.settings.supabase_storage_bucket_output)
        try:
            for ordinal in self.pipeline.output_ordinals(scenario=scenario):
                sticker_id = str(uuid.uuid4())
                path = f"{owner_id}/{set_id}/{ordinal}-{sticker_id}.svg"
                # Track before upload: Storage can commit an object and then
                # time out before returning to this process.
                uploaded_paths.append(path)
                bucket.upload(
                    path,
                    self.pipeline.render_placeholder(ordinal=ordinal, job_id=job_id),
                    {"content-type": "image/svg+xml", "upsert": "false"},
                )
                variants.append(
                    {
                        "id": sticker_id,
                        "ordinal": ordinal,
                        "expression_key": f"demo_slot_{ordinal}",
                        "storage_path": path,
                        "mime_type": "image/svg+xml",
                        "moderation_status": "passed",
                        "created_at": now,
                    }
                )
        except Exception:
            self._remove_uploaded_paths(bucket=bucket, paths=uploaded_paths)
            raise

        try:
            result = self.client.rpc(
                "complete_mock_generation",
                {
                    "p_job_id": job_id,
                    "p_owner_id": owner_id,
                    "p_set_id": set_id,
                    "p_variants": variants,
                },
            ).execute()
            actual_set_id = result.data
            if isinstance(actual_set_id, list) and actual_set_id:
                actual_set_id = actual_set_id[0]
            if isinstance(actual_set_id, dict):
                actual_set_id = actual_set_id.get("set_id")
            if actual_set_id and str(actual_set_id) != set_id:
                self._remove_uploaded_paths(bucket=bucket, paths=uploaded_paths)
                return str(actual_set_id)
            return set_id
        except Exception as rpc_error:
            reconciliation = self._reconcile_completion(
                owner_id=owner_id,
                job_id=job_id,
                candidate_set_id=set_id,
                candidate_paths=uploaded_paths,
            )
            if reconciliation.candidate_committed:
                return set_id
            if reconciliation.committed_set_id:
                self._remove_uploaded_paths(bucket=bucket, paths=uploaded_paths)
                return reconciliation.committed_set_id

            # Only stable PostgreSQL codes emitted by this RPC prove rollback.
            # Gateway/API/transient errors with inconclusive reconciliation keep
            # objects: deleting could corrupt a transaction committed after timeout.
            if (
                self._provider_error_code(rpc_error) in {"P0002", "23514", "23505"}
                or reconciliation.candidate_proven_uncommitted
            ):
                self._remove_uploaded_paths(bucket=bucket, paths=uploaded_paths)
            raise

    @staticmethod
    def _remove_uploaded_paths(*, bucket: Any, paths: list[str]) -> None:
        if not paths:
            return
        try:
            bucket.remove(paths)
        except Exception:
            # Cleanup is best effort. A later retention sweep must remove orphans.
            pass

    @staticmethod
    def _provider_error_code(exc: Exception) -> str | None:
        provider_code = getattr(exc, "code", None)
        if provider_code is not None:
            return str(provider_code)
        to_json = getattr(exc, "json", None)
        if not callable(to_json):
            return None
        try:
            payload = to_json()
        except Exception:
            return None
        if not isinstance(payload, dict) or payload.get("code") is None:
            return None
        return str(payload["code"])

    def _reconcile_completion(
        self,
        *,
        owner_id: str,
        job_id: str,
        candidate_set_id: str,
        candidate_paths: list[str],
    ) -> CompletionReconciliation:
        """Read authoritative DB state after an ambiguous RPC outcome.

        Any query failure is deliberately inconclusive: preserving potential
        committed assets is safer than deleting them.
        """

        try:
            jobs = (
                self.client.table("generation_jobs")
                .select("status")
                .eq("id", job_id)
                .eq("owner_id", owner_id)
                .limit(1)
                .execute()
                .data
                or []
            )
            sets = (
                self.client.table("sticker_sets")
                .select("id")
                .eq("job_id", job_id)
                .eq("owner_id", owner_id)
                .limit(1)
                .execute()
                .data
                or []
            )
            if not jobs:
                return CompletionReconciliation()

            status = jobs[0].get("status")
            if status in {"failed", "timed_out"} and not sets:
                return CompletionReconciliation(candidate_proven_uncommitted=True)
            if status != "succeeded" or not sets:
                return CompletionReconciliation()

            committed_set_id = str(sets[0]["id"])
            variants = (
                self.client.table("sticker_variants")
                .select("storage_path,moderation_status")
                .eq("set_id", committed_set_id)
                .eq("owner_id", owner_id)
                .order("ordinal")
                .execute()
                .data
                or []
            )
            committed_paths = {str(row.get("storage_path")) for row in variants}
            all_passed = all(row.get("moderation_status") == "passed" for row in variants)
            if len(variants) != self.pipeline.output_count or not all_passed:
                return CompletionReconciliation()

            if committed_set_id == candidate_set_id:
                expected_paths = set(candidate_paths)
                if committed_paths != expected_paths:
                    return CompletionReconciliation()
                return CompletionReconciliation(
                    committed_set_id=committed_set_id,
                    candidate_committed=True,
                )
            return CompletionReconciliation(
                committed_set_id=committed_set_id,
                candidate_proven_uncommitted=True,
            )
        except Exception:
            return CompletionReconciliation()

    def list_jobs(self, *, owner_id: str, active_only: bool) -> list[dict[str, Any]]:
        query = self.client.table("generation_jobs").select("id").eq("owner_id", owner_id)
        if active_only:
            query = query.not_.in_("status", list(TERMINAL_JOB_STATUSES))
        rows = query.order("created_at", desc=True).limit(100).execute().data or []
        return [self.get_job(owner_id=owner_id, job_id=row["id"]) for row in rows]

    def get_set(self, *, owner_id: str, set_id: str) -> dict[str, Any]:
        sticker_set = self._one(
            self.client.table("sticker_sets")
            .select(
                "id,job_id,style,subject_type,locale,catalog_version,target_count,published_count,rejected_count,status,created_at"
            )
            .eq("id", set_id)
            .eq("owner_id", owner_id)
            .eq("status", "preview")
            .limit(1)
            .execute()
            .data,
            "Sticker set",
        )
        variants = (
            self.client.table("sticker_variants")
            .select("id,ordinal,expression_key,mime_type,moderation_status,created_at")
            .eq("set_id", set_id)
            .eq("owner_id", owner_id)
            .eq("moderation_status", "passed")
            .order("ordinal")
            .execute()
            .data
            or []
        )
        if not 6 <= len(variants) <= self.pipeline.output_count:
            raise unavailable("STICKER_SET_INCOMPLETE", "The sticker set is not ready for preview.")
        return {
            **sticker_set,
            "mocked": self.pipeline.is_mock,
            "stickers": variants,
        }

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
                "DUPLICATE_STICKER_SELECTION", "Each selected sticker may appear only once."
            )
        selection_hash = hashlib.sha256(f"{set_id}:{','.join(unique_ids)}".encode()).hexdigest()
        try:
            result = (
                self.client.rpc(
                    "save_sticker_selection",
                    {
                        "p_owner_id": owner_id,
                        "p_set_id": set_id,
                        "p_sticker_ids": unique_ids,
                        "p_pack_id": str(uuid.uuid4()),
                        "p_idempotency_key": idempotency_key,
                        "p_selection_hash": selection_hash,
                    },
                )
                .execute()
                .data
            )
        except Exception as exc:
            self._raise_save_rpc_error(exc)
        row = result[0] if isinstance(result, list) else result
        if not row:
            raise unavailable("SAVE_FAILED", "The sticker selection could not be saved.")
        return self.get_pack(owner_id=owner_id, pack_id=str(row["pack_id"])), bool(row["created"])

    @staticmethod
    def _raise_save_rpc_error(exc: Exception) -> NoReturn:
        """Translate only stable PostgreSQL codes; never expose provider text."""

        provider_code = SupabaseRepository._provider_error_code(exc)

        if provider_code == "P0002":
            raise not_found("Sticker set") from None
        if provider_code == "23514":
            raise bad_request(
                "INVALID_STICKER_SELECTION",
                "The selected stickers are not valid for this set.",
            ) from None
        if provider_code == "23505":
            raise conflict(
                "IDEMPOTENCY_KEY_REUSED",
                "The Idempotency-Key was already used for a different selection.",
            ) from None
        raise exc

    def list_packs(self, *, owner_id: str) -> list[dict[str, Any]]:
        rows = (
            self.client.table("saved_packs")
            .select("id")
            .eq("owner_id", owner_id)
            .order("created_at", desc=True)
            .execute()
            .data
            or []
        )
        return [self.get_pack(owner_id=owner_id, pack_id=row["id"]) for row in rows]

    def get_pack(self, *, owner_id: str, pack_id: str) -> dict[str, Any]:
        pack = self._one(
            self.client.table("saved_packs")
            .select("id,source_set_id,title,created_at")
            .eq("id", pack_id)
            .eq("owner_id", owner_id)
            .limit(1)
            .execute()
            .data,
            "Saved pack",
        )
        items = (
            self.client.table("saved_pack_items")
            .select(
                "ordinal,sticker_variants!inner(id,ordinal,expression_key,mime_type,moderation_status,created_at,owner_id)"
            )
            .eq("pack_id", pack_id)
            .eq("sticker_variants.owner_id", owner_id)
            .order("ordinal")
            .execute()
            .data
            or []
        )
        stickers = []
        for item in items:
            sticker = item["sticker_variants"]
            stickers.append(
                {
                    **sticker,
                    "saved_ordinal": item["ordinal"],
                    "source_ordinal": sticker["ordinal"],
                }
            )
        return {**pack, "stickers": stickers}

    def delete_pack(self, *, owner_id: str, pack_id: str) -> None:
        existing = (
            self.client.table("saved_packs")
            .select("id")
            .eq("id", pack_id)
            .eq("owner_id", owner_id)
            .limit(1)
            .execute()
            .data
            or []
        )
        if not existing:
            raise not_found("Saved pack")
        self.client.table("saved_packs").delete().eq("id", pack_id).eq(
            "owner_id", owner_id
        ).execute()

    def get_sticker_asset(self, *, owner_id: str, sticker_id: str) -> tuple[bytes, str, str]:
        sticker = self._one(
            self.client.table("sticker_variants")
            .select("storage_path,mime_type,ordinal")
            .eq("id", sticker_id)
            .eq("owner_id", owner_id)
            .eq("moderation_status", "passed")
            .limit(1)
            .execute()
            .data,
            "Sticker",
        )
        try:
            content = self.client.storage.from_(
                self.settings.supabase_storage_bucket_output
            ).download(sticker["storage_path"])
        except Exception:
            raise unavailable("ASSET_UNAVAILABLE", "The sticker asset is unavailable.") from None
        return bytes(content), sticker["mime_type"], f"sticker-{sticker['ordinal']}.svg"
