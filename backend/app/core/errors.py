from typing import Any, Dict, Optional

from fastapi import HTTPException, status
from pydantic import BaseModel, Field


class ErrorDetails(BaseModel):
    code: str
    message: str
    details: Dict[str, Any] = Field(default_factory=dict)
    request_id: Optional[str] = None


class APIErrorResponse(BaseModel):
    error: ErrorDetails


class GenStickerException(HTTPException):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(status_code=status_code, detail=message)
        self.code = code
        self.message = message
        self.details = details or {}


class TenantAccessDeniedException(GenStickerException):
    def __init__(self, message: str = "Access denied to resource"):
        super().__init__(
            code="tenant_access_denied",
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
        )


class ResourceNotFoundException(GenStickerException):
    def __init__(self, resource_type: str, resource_id: str):
        super().__init__(
            code="resource_not_found",
            message=f"{resource_type} with ID '{resource_id}' was not found.",
            status_code=status.HTTP_404_NOT_FOUND,
            details={"resource_type": resource_type, "resource_id": resource_id},
        )


class ProviderNotConfiguredException(GenStickerException):
    def __init__(self, provider: str):
        super().__init__(
            code="provider_not_configured",
            message=f"Provider '{provider}' is not configured or disabled.",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            details={"provider": provider},
        )


class BudgetExceededException(GenStickerException):
    def __init__(self, message: str = "Job execution budget exceeded."):
        super().__init__(
            code="budget_exceeded",
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )
