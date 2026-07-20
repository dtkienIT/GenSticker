from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class LicenseRecord(BaseModel):
    id: str
    component: str
    source: str
    license_name: str
    commercial_use_allowed: bool
    attribution_required: bool
    reviewed_by: str
    reviewed_at: str
    notes: Optional[str] = None


class ModelBundle(BaseModel):
    id: str
    base_model: str
    identity_adapter: Optional[str] = None
    vae: Optional[str] = None
    scheduler: str = "EulerA"
    workflow_version: str = "v1.0"
    precision: str = "fp16"
    required_vram_gb: float = 8.0
    license_record_id: str
    status: str = "experimental"


class DatasetManifest(BaseModel):
    dataset_id: str
    version: str
    identity_count: int
    calibration_count: int
    holdout_count: int
    provenance: str
    consent_status: str
    license_status: str
    files: List[str] = Field(default_factory=list)


class EvalRun(BaseModel):
    id: str
    provider: str
    model_bundle: str
    workflow_version: str
    seed: int
    started_at: str
    completed_at: str
    duration_ms: float
    gpu_seconds: float
    estimated_cost_usd: float
    metrics: Dict[str, Any] = Field(default_factory=dict)
    artifacts: List[Dict[str, Any]] = Field(default_factory=list)
    status: str = "completed"
