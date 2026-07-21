import json

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.core.security import get_current_user
from backend.app.db.models.cost import CostLedger
from backend.app.db.models.user import User
from backend.app.db.session import get_db

router = APIRouter()


@router.get("/cost-ledger")
def list_cost_ledger(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entries = (
        db.query(CostLedger)
        .filter(CostLedger.user_id == current_user.id)
        .order_by(CostLedger.created_at.desc())
        .all()
    )

    return [
        {
            "id": c.id,
            "user_id": c.user_id,
            "job_id": c.job_id,
            "provider": c.provider,
            "model_name": c.model_name,
            "workflow_version": c.workflow_version,
            "gpu_seconds": c.gpu_seconds,
            "retry_count": c.retry_count,
            "estimated_cost_usd": c.estimated_cost_usd,
            "metadata": json.loads(c.metadata_json),
            "created_at": c.created_at.isoformat(),
        }
        for c in entries
    ]
