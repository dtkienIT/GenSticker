import uuid
from typing import Optional

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.logging import log_event
from backend.app.db.models.user import User
from backend.app.db.session import get_db


def get_current_user_id(
    x_dev_user_id: Optional[str] = Header(None, alias="X-Dev-User-Id"),
) -> str:
    user_id = x_dev_user_id or (settings.DEFAULT_DEV_USER_ID if settings.DEV_AUTH_ENABLED else None)

    if not user_id:
        log_event("ERROR", "Authentication failed: Missing X-Dev-User-Id header")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please set X-Dev-User-Id header.",
        )
    return user_id


def get_current_user(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
) -> User:
    user = db.query(User).filter(User.external_id == user_id).first()
    if not user:
        log_event("INFO", f"Auto-provisioning new user: {user_id}")
        user = User(
            id=str(uuid.uuid4()),
            external_id=user_id,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    log_event("DEBUG", f"Request from user: {user.id} (external_id: {user.external_id})")
    return user
