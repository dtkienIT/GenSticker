import json
import asyncio
from typing import Dict, Any
from google import genai
from models import ValidationResult
from prompts import VALIDATION_PROMPT

def _call_gemini_validation(image_base64: str, mime_type: str, api_key: str) -> Dict[str, Any]:
    client = genai.Client(api_key=api_key)
    
    schema = {
        "type": "object",
        "properties": {
            "face_count": {"type": "integer"},
            "has_clear_face": {"type": "boolean"},
            "image_quality": {"type": "string", "enum": ["good", "poor", "blurry", "dark"]},
            "is_safe": {"type": "boolean"},
            "safety_reason": {"type": "string", "nullable": True},
            "subject_type": {"type": "string", "enum": ["person", "pet", "object", "multiple_people", "unknown"]}
        },
        "required": ["face_count", "has_clear_face", "image_quality", "is_safe", "subject_type"]
    }
    
    interaction = client.interactions.create(
        model="gemini-3.6-flash",
        input=[
            {"type": "text", "text": VALIDATION_PROMPT},
            {"type": "image", "data": image_base64, "mime_type": mime_type}
        ],
        response_format={
            "type": "text",
            "mime_type": "application/json",
            "schema": schema
        }
    )
    return json.loads(interaction.output_text)

async def validate_image(image_base64: str, mime_type: str, api_key: str) -> ValidationResult:
    try:
        # Run synchronous API call in a thread
        result_json = await asyncio.to_thread(
            _call_gemini_validation, image_base64, mime_type, api_key
        )
        
        # Check safety first
        if not result_json.get("is_safe", True):
            return ValidationResult(
                valid=False,
                error_code="UNSAFE_CONTENT",
                error_message=result_json.get("safety_reason", "Image content is not safe for processing."),
                details=result_json
            )
            
        # Check subject type
        subject_type = result_json.get("subject_type")
        if subject_type == "multiple_people":
            return ValidationResult(
                valid=False,
                error_code="MULTIPLE_PEOPLE",
                error_message="Please upload a photo with exactly one person.",
                details=result_json
            )
        elif subject_type != "person":
            return ValidationResult(
                valid=False,
                error_code="INVALID_SUBJECT",
                error_message="Please upload a photo of a person.",
                details=result_json
            )
            
        # Check face count
        face_count = result_json.get("face_count", 0)
        if face_count == 0:
            return ValidationResult(
                valid=False,
                error_code="NO_FACE",
                error_message="No face detected in the image. Please upload a clear selfie.",
                details=result_json
            )
        elif face_count > 1:
            return ValidationResult(
                valid=False,
                error_code="MULTIPLE_FACES",
                error_message="Multiple faces detected. Please upload a photo with exactly one person.",
                details=result_json
            )
            
        # Check clear face
        if not result_json.get("has_clear_face", False):
            return ValidationResult(
                valid=False,
                error_code="UNCLEAR_FACE",
                error_message="The face in the image is not clear enough. Please upload a better quality photo.",
                details=result_json
            )
            
        # Check image quality
        quality = result_json.get("image_quality")
        if quality != "good":
            return ValidationResult(
                valid=False,
                error_code="POOR_QUALITY",
                error_message=f"Image quality is too {quality}. Please upload a clearer, well-lit photo.",
                details=result_json
            )
            
        # All checks passed
        return ValidationResult(valid=True, details=result_json)
        
    except Exception as e:
        return ValidationResult(
            valid=False,
            error_code="API_ERROR",
            error_message=f"Error validating image: {str(e)}"
        )
