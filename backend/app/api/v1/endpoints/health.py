from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.storage.asset_store import default_asset_store

router = APIRouter()


@router.get("/health")
def health_check():
    return {"status": "ok", "service": "gensticker-backend"}


@router.get("/ready")
def readiness_check(db: Session = Depends(get_db)):
    # Verify DB connectivity
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    # Verify asset store accessibility
    try:
        root_path = default_asset_store.root_dir
        asset_store_ok = root_path.exists()
    except Exception:
        asset_store_ok = False

    ready = db_ok and asset_store_ok
    return {
        "status": "ready" if ready else "not_ready",
        "database": db_ok,
        "asset_store": asset_store_ok,
    }
