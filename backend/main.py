import os
import json
import asyncio
import logging
from typing import AsyncGenerator
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from google import genai

from models import (
    ValidationRequest, 
    ValidationResult, 
    PackGenerateRequest, 
    GenerateResult,
    ExpressionConfig
)
from prompts import EXPRESSIONS, get_sticker_prompt
from validators import validate_image
from bg_remover import remove_bg_base64
from cloudflare_provider import (
    call_cloudflare_generation, 
    DEFAULT_CF_IMAGE_MODEL, 
    DEFAULT_CF_VISION_MODEL
)
from openai_provider import (
    call_openai_generation,
    DEFAULT_OPENAI_IMAGE_MODEL,
    DEFAULT_OPENAI_VISION_MODEL
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

AI_PROVIDER = os.getenv("AI_PROVIDER", "gemini").lower() # "gemini", "cloudflare", or "openai"

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

CF_ACCOUNT_ID = os.getenv("CF_ACCOUNT_ID", "")
CF_API_TOKEN = os.getenv("CF_API_TOKEN", "")
CF_IMAGE_MODEL = os.getenv("CF_IMAGE_MODEL", DEFAULT_CF_IMAGE_MODEL)
CF_VISION_MODEL = os.getenv("CF_VISION_MODEL", DEFAULT_CF_VISION_MODEL)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_IMAGE_MODEL = os.getenv("OPENAI_IMAGE_MODEL", DEFAULT_OPENAI_IMAGE_MODEL)
OPENAI_VISION_MODEL = os.getenv("OPENAI_VISION_MODEL", DEFAULT_OPENAI_VISION_MODEL)

if AI_PROVIDER == "cloudflare":
    if not CF_ACCOUNT_ID or not CF_API_TOKEN:
        logger.warning("AI_PROVIDER is set to 'cloudflare', but CF_ACCOUNT_ID or CF_API_TOKEN is missing.")
    else:
        logger.info(f"AI Provider initialized: Cloudflare Workers AI (Image: {CF_IMAGE_MODEL})")
elif AI_PROVIDER == "openai":
    if not OPENAI_API_KEY:
        logger.warning("AI_PROVIDER is set to 'openai', but OPENAI_API_KEY is missing.")
    else:
        logger.info(f"AI Provider initialized: OpenAI API (Image: {OPENAI_IMAGE_MODEL})")
else:
    if not GEMINI_API_KEY:
        logger.warning("AI_PROVIDER is set to 'gemini', but GEMINI_API_KEY is missing.")
    else:
        logger.info("AI Provider initialized: Google Gemini API (gemini-3.1-flash-image)")

# Initialize FastAPI app
app = FastAPI(title="AI Sticker Generation API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    image_model = "gemini-3.1-flash-image"
    vision_model = "gemini-3.6-flash"
    if AI_PROVIDER == "cloudflare":
        image_model = CF_IMAGE_MODEL
        vision_model = CF_VISION_MODEL
    elif AI_PROVIDER == "openai":
        image_model = OPENAI_IMAGE_MODEL
        vision_model = OPENAI_VISION_MODEL

    return {
        "status": "ok",
        "provider": AI_PROVIDER,
        "models": {
            "image": image_model,
            "vision": vision_model
        }
    }

@app.post("/api/validate", response_model=ValidationResult)
async def validate_endpoint(request: ValidationRequest):
    if AI_PROVIDER == "cloudflare":
        if not CF_ACCOUNT_ID or not CF_API_TOKEN:
            raise HTTPException(status_code=500, detail="Cloudflare credentials not configured in .env")
    elif AI_PROVIDER == "openai":
        if not OPENAI_API_KEY:
            raise HTTPException(status_code=500, detail="OpenAI API key not configured in .env")
    else:
        if not GEMINI_API_KEY:
            raise HTTPException(status_code=500, detail="Gemini API key not configured in .env")
        
    result = await validate_image(
        request.image_base64, 
        request.mime_type,
        provider=AI_PROVIDER,
        api_key=GEMINI_API_KEY,
        cf_account_id=CF_ACCOUNT_ID,
        cf_api_token=CF_API_TOKEN,
        openai_api_key=OPENAI_API_KEY,
        openai_vision_model=OPENAI_VISION_MODEL
    )
    return result

def _call_gemini_generation(image_base64: str, mime_type: str, expression: ExpressionConfig, api_key: str) -> str:
    client = genai.Client(api_key=api_key)
    prompt = get_sticker_prompt(expression)
    
    interaction = client.interactions.create(
        model="gemini-3.1-flash-image",
        input=[
            {"type": "text", "text": prompt},
            {"type": "image", "data": image_base64, "mime_type": mime_type}
        ],
        response_format={"type": "image", "mime_type": "image/jpeg", "aspect_ratio": "1:1", "image_size": "512"}
    )
    return interaction.output_image.data

async def generate_single_sticker(image_base64: str, mime_type: str, expression: ExpressionConfig) -> GenerateResult:
    try:
        if AI_PROVIDER == "cloudflare":
            raw_result_base64 = await asyncio.to_thread(
                call_cloudflare_generation,
                image_base64,
                mime_type,
                expression,
                CF_ACCOUNT_ID,
                CF_API_TOKEN,
                CF_IMAGE_MODEL
            )
        elif AI_PROVIDER == "openai":
            raw_result_base64 = await asyncio.to_thread(
                call_openai_generation,
                image_base64,
                mime_type,
                expression,
                OPENAI_API_KEY,
                OPENAI_IMAGE_MODEL
            )
        else:
            raw_result_base64 = await asyncio.to_thread(
                _call_gemini_generation,
                image_base64,
                mime_type,
                expression,
                GEMINI_API_KEY
            )
        
        logger.info(f"[{expression.id}] Raw image base64 length: {len(raw_result_base64)}")
        
        # Background removal toggle
        enable_bg = os.getenv("ENABLE_BG_REMOVAL", "true").lower() == "true"
        
        if enable_bg:
            final_base64 = await asyncio.to_thread(
                remove_bg_base64, raw_result_base64
            )
            logger.info(f"[{expression.id}] After bg removal base64 length: {len(final_base64)}")
        else:
            final_base64 = raw_result_base64
            logger.info(f"[{expression.id}] BG removal DISABLED, returning raw image")
        
        return GenerateResult(
            expression_id=expression.id,
            image_base64=final_base64,
            success=True
        )
    except Exception as e:
        logger.error(f"Error generating sticker for {expression.id} ({AI_PROVIDER}): {str(e)}")
        error_msg = str(e).lower()
        filtered = "safety" in error_msg or "blocked" in error_msg or "filtered" in error_msg
        return GenerateResult(
            expression_id=expression.id,
            success=False,
            error=str(e),
            filtered=filtered
        )

@app.post("/api/generate-pack")
async def generate_pack_endpoint(request: PackGenerateRequest):
    if AI_PROVIDER == "cloudflare":
        if not CF_ACCOUNT_ID or not CF_API_TOKEN:
            raise HTTPException(status_code=500, detail="Cloudflare credentials not configured in .env")
    elif AI_PROVIDER == "openai":
        if not OPENAI_API_KEY:
            raise HTTPException(status_code=500, detail="OpenAI API key not configured in .env")
    else:
        if not GEMINI_API_KEY:
            raise HTTPException(status_code=500, detail="Gemini API key not configured in .env")
        
    async def sse_generator() -> AsyncGenerator[str, None]:
        tasks = [
            generate_single_sticker(request.image_base64, request.mime_type, expr)
            for expr in EXPRESSIONS
        ]
        
        for completed_task in asyncio.as_completed(tasks):
            try:
                result = await completed_task
                yield f"data: {result.model_dump_json()}\n\n"
            except Exception as e:
                logger.error(f"Unexpected error in parallel generation: {str(e)}")
                pass
                
        yield "data: {\"done\": true}\n\n"

    return StreamingResponse(sse_generator(), media_type="text/event-stream")
