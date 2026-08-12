from __future__ import annotations

import hashlib
import re
import uuid

import jwt
from fastapi import Header, Request
from fastapi.security.utils import get_authorization_scheme_param

from app.config import Settings
from app.domain import Principal
from app.errors import unauthorized, unavailable

DEVICE_ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_.:-]{7,127}$")
DEVICE_NAMESPACE = uuid.UUID("c9cd79d7-43f0-4728-9af6-b2e357392ea7")


class Authenticator:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._jwks_client: jwt.PyJWKClient | None = None

    def authenticate(
        self,
        request: Request,
        x_device_id: str | None = Header(default=None, alias="X-Device-ID"),
    ) -> Principal:
        if self.settings.data_backend == "local":
            return self._authenticate_device(x_device_id)
        return self._authenticate_bearer(request)

    def _authenticate_device(self, device_id: str | None) -> Principal:
        if not self.settings.allow_local_demo_auth:
            raise unavailable(
                "LOCAL_AUTH_DISABLED",
                "Local demo authentication is disabled.",
            )
        if not device_id or not DEVICE_ID_PATTERN.fullmatch(device_id):
            raise unauthorized(
                "A valid X-Device-ID header (8-128 safe characters) is required in local demo mode."
            )
        # The raw device identifier never becomes a storage path or database owner ID.
        digest = hashlib.sha256(device_id.encode("utf-8")).hexdigest()
        owner_id = str(uuid.uuid5(DEVICE_NAMESPACE, digest))
        return Principal(owner_id=owner_id, auth_mode="local_device")

    def _authenticate_bearer(self, request: Request) -> Principal:
        scheme, token = get_authorization_scheme_param(
            request.headers.get("Authorization")
        )
        if scheme.lower() != "bearer" or not token:
            raise unauthorized()
        if not self.settings.supabase_url:
            raise unavailable("AUTH_NOT_CONFIGURED", "Supabase authentication is not configured.")

        try:
            header = jwt.get_unverified_header(token)
            algorithm = str(header.get("alg", ""))
            if algorithm == "HS256":
                if not self.settings.supabase_jwt_secret:
                    raise unavailable(
                        "AUTH_NOT_CONFIGURED",
                        "SUPABASE_JWT_SECRET is required for legacy HS256 tokens.",
                    )
                key: object = self.settings.supabase_jwt_secret
            else:
                if algorithm not in {"RS256", "ES256"}:
                    raise unauthorized("The access token uses an unsupported algorithm.")
                if self._jwks_client is None:
                    url = self.settings.supabase_url.rstrip("/")
                    self._jwks_client = jwt.PyJWKClient(
                        f"{url}/auth/v1/.well-known/jwks.json",
                        cache_keys=True,
                    )
                key = self._jwks_client.get_signing_key_from_jwt(token).key

            claims = jwt.decode(
                token,
                key,
                algorithms=[algorithm],
                audience=self.settings.supabase_jwt_audience,
                issuer=f"{self.settings.supabase_url.rstrip('/')}/auth/v1",
                options={"require": ["exp", "sub", "aud"]},
            )
            owner_id = str(uuid.UUID(str(claims["sub"])))
        except Exception as exc:
            if getattr(exc, "code", None) == "AUTH_NOT_CONFIGURED":
                raise
            raise unauthorized("The access token is invalid or expired.") from None
        return Principal(owner_id=owner_id, auth_mode="supabase")

