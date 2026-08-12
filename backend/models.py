from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

class ValidationRequest(BaseModel):
    image_base64: str = Field(..., description="Base64 encoded image string")
    mime_type: str = Field(..., description="MIME type of the image")

class ValidationResult(BaseModel):
    valid: bool
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    details: Optional[Dict[str, Any]] = None

class ExpressionConfig(BaseModel):
    id: str
    name_en: str
    name_vi: str
    emoji: str
    prompt_modifier: str
    color: str

class GenerateRequest(BaseModel):
    image_base64: str
    mime_type: str
    expression_id: str

class GenerateResult(BaseModel):
    expression_id: str
    image_base64: Optional[str] = None
    success: bool
    error: Optional[str] = None
    filtered: bool = False

class PackGenerateRequest(BaseModel):
    image_base64: str
    mime_type: str
