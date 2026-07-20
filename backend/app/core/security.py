import uuid
from typing import Optional

from backend.app.core.config import settings
from backend.app.db.models.user import User
from backend.app.db.session import get_db
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session


def get_current_user_id(
    x_dev_user_id: Optional[str] = Header(None, alias="X-Dev-User-Id"),
) -> str:
    user_id = x_dev_user_id or (settings.DEFAULT_DEV_USER_ID if settings.DEV_AUTH_ENABLED else None)

    if not user_id:
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
        # Auto-provision local dev user
        user = User(
            id=str(uuid.uuid4()),
            external_id=user_id,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user
