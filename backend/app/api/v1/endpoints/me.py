from fastapi import APIRouter, Depends

from backend.app.core.security import get_current_user
from backend.app.db.models.user import User

router = APIRouter()


@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)) -> dict[str, str]:
    return {
        "id": current_user.id,
        "external_id": current_user.external_id,
        "display_name": current_user.display_name,
        "locale": current_user.locale,
        "created_at": current_user.created_at.isoformat(),
        "updated_at": current_user.updated_at.isoformat(),
    }
