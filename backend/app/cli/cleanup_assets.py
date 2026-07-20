import sys
from datetime import datetime, timezone

from backend.app.db.models.asset import Asset
from backend.app.db.session import SessionLocal
from backend.app.storage.asset_store import default_asset_store
from sqlalchemy import select


def cleanup_expired_assets() -> int:
    now = datetime.now(timezone.utc)
    db = SessionLocal()
    cleaned_count = 0
    try:
        stmt = select(Asset).where(Asset.expires_at.is_not(None), Asset.expires_at <= now, Asset.deleted_at.is_(None))
        expired_assets = db.scalars(stmt).all()

        for asset in expired_assets:
            default_asset_store.delete_asset(asset.relative_path)
            asset.deleted_at = now
            cleaned_count += 1
        db.commit()
    finally:
        db.close()
    return cleaned_count


if __name__ == "__main__":
    count = cleanup_expired_assets()
    sys.exit(0)
