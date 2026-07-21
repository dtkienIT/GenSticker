import time
import uuid
from collections.abc import Awaitable, Callable

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.responses import Response

from backend.app.api.v1.router import api_router
from backend.app.core.config import settings
from backend.app.core.errors import GenStickerException
from backend.app.core.logging import log_event

app = FastAPI(
    title="GenSticker Local API",
    description="Local-first Backend & AI Job Runner API for GenSticker Mobile",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_middleware(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    request.state.request_id = request_id

    start_time = time.time()
    response = await call_next(request)
    duration_ms = round((time.time() - start_time) * 1000, 2)

    response.headers["X-Request-ID"] = request_id

    log_event(
        "INFO",
        f"{request.method} {request.url.path} HTTP/{response.status_code}",
        request_id=request_id,
        duration_ms=duration_ms,
    )
    return response


@app.exception_handler(GenStickerException)
async def gensticker_exception_handler(
    request: Request, exc: GenStickerException
) -> JSONResponse:
    req_id = getattr(request.state, "request_id", None)
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
                "request_id": req_id,
            }
        },
    )


app.include_router(api_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=True,
    )
