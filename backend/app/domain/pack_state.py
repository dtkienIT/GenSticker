import json
import uuid
from collections.abc import Iterable, Mapping, Sequence
from typing import Any

from backend.app.db.models.job import GenerationJob
from backend.app.db.models.pack import Pack

CORE_EIGHT_EMOTIONS = (
    "happy",
    "laughing",
    "love",
    "angry",
    "sad",
    "surprised",
    "confused",
    "sleepy",
)


def create_core_eight_slots() -> list[dict[str, Any]]:
    return [
        {
            "id": str(uuid.uuid4()),
            "emotion_id": emotion_id,
            "status": "queued",
            "progress": 0,
            "selected_asset_id": None,
            "candidate_asset_ids": [],
            "error_code": None,
            "retry_count": 0,
            "image_uri": None,
            "previous_image_uri": None,
            "text": None,
        }
        for emotion_id in CORE_EIGHT_EMOTIONS
    ]


def load_pack_slots(pack: Pack) -> list[dict[str, Any]]:
    try:
        slots = json.loads(pack.slots_json or "[]")
    except (TypeError, ValueError, json.JSONDecodeError):
        return []
    return (
        [dict(slot) for slot in slots if isinstance(slot, Mapping)]
        if isinstance(slots, list)
        else []
    )


def save_pack_slots(pack: Pack, slots: Sequence[Mapping[str, Any]]) -> None:
    pack.slots_json = json.dumps([dict(slot) for slot in slots], separators=(",", ":"))


def get_job_slot_id(job: GenerationJob) -> str | None:
    try:
        request_data = json.loads(job.request_json or "{}")
    except (TypeError, ValueError, json.JSONDecodeError):
        return None
    extra_params = request_data.get("extra_params")
    if not isinstance(extra_params, Mapping):
        return None
    slot_id = extra_params.get("slot_id")
    return slot_id if isinstance(slot_id, str) and slot_id else None


def aggregate_pack_status(slots: Sequence[Mapping[str, Any]]) -> str:
    if not slots:
        return "DRAFT"

    statuses = [str(slot.get("status", "pending")) for slot in slots]
    if all(status == "completed" for status in statuses):
        return "COMPLETED"
    if any(status in {"queued", "pending", "generating"} for status in statuses):
        all_waiting = all(status in {"queued", "pending"} for status in statuses)
        return "QUEUED" if all_waiting else "GENERATING"
    if any(status == "completed" for status in statuses):
        return "PARTIAL"
    if all(status == "cancelled" for status in statuses):
        return "CANCELLED"
    return "FAILED"


def _candidate_asset_ids(job: GenerationJob) -> list[str]:
    try:
        result = json.loads(job.result_json or "{}")
    except (TypeError, ValueError, json.JSONDecodeError):
        return []

    candidates = result.get("candidates", []) if isinstance(result, Mapping) else []
    asset_ids: list[str] = []
    if isinstance(candidates, list):
        for candidate in candidates:
            if not isinstance(candidate, Mapping):
                continue
            asset_id = candidate.get("asset_id") or candidate.get("id")
            if isinstance(asset_id, str) and asset_id:
                asset_ids.append(asset_id)
    return asset_ids


def apply_job_state_to_pack(pack: Pack, job: GenerationJob) -> bool:
    """Apply one expression-generation job to its slot; caller owns DB commit."""
    slot_id = get_job_slot_id(job)
    if not slot_id:
        return False

    slots = load_pack_slots(pack)
    slot = next((item for item in slots if item.get("id") == slot_id), None)
    if slot is None:
        return False

    before = json.dumps(slot, sort_keys=True)
    before_pack_status = pack.status
    slot["progress"] = max(0, min(100, int(job.progress or 0)))

    if job.status == "queued":
        slot.update(
            status="queued",
            selected_asset_id=None,
            candidate_asset_ids=[],
            image_uri=None,
            error_code=None,
        )
    elif job.status == "running":
        slot["status"] = "generating"
        slot["error_code"] = None
    elif job.status == "succeeded":
        asset_ids = _candidate_asset_ids(job)
        if asset_ids:
            selected_asset_id = asset_ids[0]
            slot.update(
                status="completed",
                progress=100,
                selected_asset_id=selected_asset_id,
                candidate_asset_ids=asset_ids,
                image_uri=f"/api/v1/assets/{selected_asset_id}/content",
                error_code=None,
            )
        else:
            slot.update(status="failed", error_code="generation_failed")
    elif job.status == "cancelled":
        slot.update(status="cancelled", error_code="job_cancelled")
    elif job.status == "failed":
        slot.update(status="failed", error_code=job.error_code or "generation_failed")

    save_pack_slots(pack, slots)
    pack.status = aggregate_pack_status(slots)
    return before != json.dumps(slot, sort_keys=True) or before_pack_status != pack.status


def reconcile_pack_from_jobs(pack: Pack, jobs: Iterable[GenerationJob]) -> bool:
    changed = False
    for job in jobs:
        changed = apply_job_state_to_pack(pack, job) or changed

    slots = load_pack_slots(pack)
    aggregate_status = aggregate_pack_status(slots)
    if pack.status != aggregate_status:
        pack.status = aggregate_status
        changed = True
    return changed
