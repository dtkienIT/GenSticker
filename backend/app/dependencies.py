from __future__ import annotations

from fastapi import Header, Request

from app.domain import Principal
from app.repository import Repository


def get_repository(request: Request) -> Repository:
    return request.app.state.repository


def get_principal(
    request: Request,
    x_device_id: str | None = Header(default=None, alias="X-Device-ID"),
) -> Principal:
    return request.app.state.authenticator.authenticate(
        request=request,
        x_device_id=x_device_id,
    )

