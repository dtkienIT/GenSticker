from __future__ import annotations

from typing import Annotated

from fastapi import Header, HTTPException, Request, status

from app.config import settings
from app.services.supabase_service import SupabaseService


LOCAL_DEMO_TOKEN = "local-dev-only"
LOOPBACK_HOSTS = {"127.0.0.1", "::1", "testclient"}


async def require_user_id(
    request: Request,
    authorization: Annotated[str | None, Header()] = None,
) -> str:
    """Return the authenticated user id without exposing provider credentials."""
    scheme, _, token = (authorization or "").partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    client_host = request.client.host if request.client else ""
    if (
        settings.ALLOW_LOCAL_DEMO_AUTH
        and
        settings.APP_ENV == "development"
        and client_host in LOOPBACK_HOSTS
        and token == LOCAL_DEMO_TOKEN
    ):
        return "local-demo-user"

    user_id = await SupabaseService.verify_access_token(token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user_id
