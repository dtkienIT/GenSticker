import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from backend.app.core.config import settings
from backend.app.core.errors import BudgetExceededException
from backend.app.db.models.cost import CostLedger
from sqlalchemy.orm import Session


class BudgetPolicy:
    def __init__(
        self,
        max_gpu_seconds_per_job: Optional[float] = None,
        max_retries_per_job: Optional[int] = None,
    ):
        self.max_gpu_seconds_per_job = (
            max_gpu_seconds_per_job
            if max_gpu_seconds_per_job is not None
            else float(settings.MAX_GPU_SECONDS_PER_JOB)
        )
        self.max_retries_per_job = (
            max_retries_per_job if max_retries_per_job is not None else settings.MAX_JOB_RETRIES
        )

    def check_budget(self, current_gpu_seconds: float, retry_count: int) -> None:
        if current_gpu_seconds > self.max_gpu_seconds_per_job:
            raise BudgetExceededException(
                f"Job elapsed GPU seconds ({current_gpu_seconds:.1f}s) exceeded limit of {self.max_gpu_seconds_per_job}s."
            )
        if retry_count > self.max_retries_per_job:
            raise BudgetExceededException(
                f"Job retry count ({retry_count}) exceeded maximum allowed retries of {self.max_retries_per_job}."
            )


class CostLedgerService:
    def __init__(self, cost_per_second_usd: Optional[float] = None):
        self.cost_per_second_usd = (
            cost_per_second_usd
            if cost_per_second_usd is not None
            else settings.MOCK_COST_PER_SECOND_USD
        )

    def record_cost(
        self,
        db: Session,
        user_id: str,
        job_id: Optional[str],
        provider: str,
        model_name: str,
        workflow_version: str,
        gpu_seconds: float,
        retry_count: int = 0,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> CostLedger:
        estimated_cost = round(gpu_seconds * self.cost_per_second_usd, 6)

        entry = CostLedger(
            id=str(uuid.uuid4()),
            user_id=user_id,
            job_id=job_id,
            provider=provider,
            model_name=model_name,
            workflow_version=workflow_version,
            gpu_seconds=gpu_seconds,
            retry_count=retry_count,
            estimated_cost_usd=estimated_cost,
            metadata_json=json.dumps(metadata or {}),
            created_at=datetime.now(timezone.utc),
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        return entry


default_budget_policy = BudgetPolicy()
default_cost_ledger_service = CostLedgerService()
