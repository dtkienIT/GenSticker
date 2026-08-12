from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class AppError(Exception):
    status_code: int
    code: str
    title: str
    detail: str
    retryable: bool = False

    def __str__(self) -> str:
        return self.detail


def bad_request(code: str, detail: str) -> AppError:
    return AppError(400, code, "Invalid request", detail)


def unauthorized(detail: str = "Authentication is required.") -> AppError:
    return AppError(401, "AUTH_REQUIRED", "Authentication required", detail)


def forbidden(detail: str) -> AppError:
    return AppError(403, "FORBIDDEN", "Forbidden", detail)


def not_found(resource: str) -> AppError:
    return AppError(404, "NOT_FOUND", "Resource not found", f"{resource} was not found.")


def conflict(code: str, detail: str) -> AppError:
    return AppError(409, code, "Request conflict", detail)


def unavailable(code: str, detail: str) -> AppError:
    return AppError(503, code, "Service unavailable", detail, retryable=True)

