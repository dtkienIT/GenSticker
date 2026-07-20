import json
import logging
import sys
from datetime import datetime, timezone
from typing import Any, Dict, Optional


class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_data: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
        }

        # Add structured fields attached to extra
        if hasattr(record, "extra") and isinstance(record.extra, dict):  # type: ignore[attr-defined]
            for key, val in record.extra.items():  # type: ignore[attr-defined]
                log_data[key] = val

        for attr in ["request_id", "user_id", "job_id", "stage", "duration_ms", "provider", "error_code"]:
            if hasattr(record, attr):
                log_data[attr] = getattr(record, attr)

        return json.dumps(log_data)


def setup_logging(log_level: str = "INFO") -> logging.Logger:
    logger = logging.getLogger("gensticker")
    logger.setLevel(log_level.upper())
    logger.handlers.clear()

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())
    logger.addHandler(handler)
    logger.propagate = False
    return logger


logger = setup_logging()


def log_event(
    level: str,
    message: str,
    request_id: Optional[str] = None,
    user_id: Optional[str] = None,
    job_id: Optional[str] = None,
    stage: Optional[str] = None,
    duration_ms: Optional[float] = None,
    provider: Optional[str] = None,
    error_code: Optional[str] = None,
    **kwargs: Any,
) -> None:
    extra = {
        "request_id": request_id,
        "user_id": user_id,
        "job_id": job_id,
        "stage": stage,
        "duration_ms": duration_ms,
        "provider": provider,
        "error_code": error_code,
        **kwargs,
    }
    log_func = getattr(logger, level.lower(), logger.info)
    log_func(message, extra={"extra": extra})
