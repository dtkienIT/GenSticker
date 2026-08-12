from __future__ import annotations

import logging
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.adapters.local import LocalRepository
from app.api.routes import router as api_router
from app.config import Settings, get_settings
from app.errors import AppError
from app.mock_pipeline import MockStickerPipeline
from app.schemas import HealthResponse
from app.security import Authenticator

logger = logging.getLogger("gensticker.api")


def _problem(
    request: Request,
    *,
    status_code: int,
    code: str,
    title: str,
    detail: str,
    retryable: bool,
) -> JSONResponse:
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    return JSONResponse(
        status_code=status_code,
        media_type="application/problem+json",
        content={
            "type": f"https://errors.gensticker.local/{code.lower()}",
            "title": title,
            "status": status_code,
            "code": code,
            "detail": detail,
            "retryable": retryable,
            "request_id": request_id,
        },
        headers={"X-Request-ID": request_id},
    )


def create_app(settings: Settings | None = None) -> FastAPI:
    runtime_settings = settings or get_settings()
    runtime_settings.assert_runtime_safety()
    pipeline = MockStickerPipeline(runtime_settings.mock_stage_seconds)

    if runtime_settings.data_backend == "supabase":
        runtime_settings.assert_supabase_configuration()
        from app.adapters.supabase import SupabaseRepository

        repository = SupabaseRepository(runtime_settings, pipeline)
    else:
        repository = LocalRepository(runtime_settings, pipeline)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        repository.initialize()
        yield

    app = FastAPI(
        title=runtime_settings.app_name,
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs" if runtime_settings.app_env != "production" else None,
        redoc_url=None,
    )
    app.state.settings = runtime_settings
    app.state.repository = repository
    app.state.authenticator = Authenticator(runtime_settings)

    origins = runtime_settings.cors_origin_list
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials="*" not in origins,
        allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Idempotency-Key", "X-Device-ID"],
    )

    @app.middleware("http")
    async def attach_request_id(request: Request, call_next):
        incoming = request.headers.get("X-Request-ID", "")
        try:
            request_id = str(uuid.UUID(incoming)) if incoming else str(uuid.uuid4())
        except ValueError:
            request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response

    @app.exception_handler(AppError)
    async def handle_app_error(request: Request, exc: AppError) -> JSONResponse:
        return _problem(
            request,
            status_code=exc.status_code,
            code=exc.code,
            title=exc.title,
            detail=exc.detail,
            retryable=exc.retryable,
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        # Do not echo multipart values or raw Pydantic inputs into client logs.
        return _problem(
            request,
            status_code=422,
            code="REQUEST_VALIDATION_FAILED",
            title="Request validation failed",
            detail="One or more request fields are invalid.",
            retryable=False,
        )

    @app.exception_handler(Exception)
    async def handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
        request_id = getattr(request.state, "request_id", "unassigned")
        # Log only the exception class. Raw provider/DB messages can contain
        # storage paths or other sensitive implementation details.
        logger.error(
            "Unhandled request failure request_id=%s exception_type=%s",
            request_id,
            type(exc).__name__,
        )
        return _problem(
            request,
            status_code=500,
            code="INTERNAL_SERVER_ERROR",
            title="Internal server error",
            detail="The request could not be completed.",
            retryable=False,
        )

    @app.get("/health/live", response_model=HealthResponse, tags=["health"])
    def live() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/health/ready", response_model=HealthResponse, tags=["health"])
    def ready() -> JSONResponse | dict[str, str]:
        if repository.ready():
            return {"status": "ok"}
        return JSONResponse(status_code=503, content={"status": "not_ready"})

    app.include_router(api_router)
    return app


app = create_app()
