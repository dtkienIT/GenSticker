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

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    logger.warning("GEMINI_API_KEY is not set in environment variables.")

# Initialize FastAPI app
app = FastAPI(title="AI Sticker Generation API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import requests

def get_api_key():
    load_dotenv(override=True)
    return os.getenv("GEMINI_API_KEY")

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

@app.post("/api/validate", response_model=ValidationResult)
async def validate_endpoint(request: ValidationRequest):
    api_key = get_api_key()
    if not api_key:
        raise HTTPException(status_code=500, detail="API key not configured")
        
    result = await validate_image(request.image_base64, request.mime_type, api_key)
    return result

def _call_gemini_generation(image_base64: str, mime_type: str, expression: ExpressionConfig, api_key: str) -> str:
    base_url = os.getenv("API_BASE_URL")
    
    if base_url or api_key.startswith("sk-"):
        url = f"{base_url.rstrip('/')}/chat/completions" if base_url else "https://omni.tdigroup.vn/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        prompt = get_sticker_prompt(expression) + "\nTransform the input image into a cute chibi sticker. Return JSON: {\"image_base64\": \"<base64_data_or_svg>\"}"
        payload = {
            "model": "ag/gemini-3.6-flash-high",
            "stream": False,
            "messages": [

                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{image_base64}"}}
                    ]
                }
            ]
        }
        res = requests.post(url, headers=headers, json=payload, timeout=60)
        res.raise_for_status()
        content = res.json()["choices"][0]["message"]["content"]
        if "```" in content:
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        data = json.loads(content.strip())
        return data.get("image_base64", "")

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


async def generate_single_sticker(image_base64: str, mime_type: str, expression: ExpressionConfig, api_key: str) -> GenerateResult:
    try:
        # Run synchronous API call in a thread
        raw_result_base64 = await asyncio.to_thread(
            _call_gemini_generation, image_base64, mime_type, expression, api_key
        )
        
        # Remove background to get transparent PNG
        clean_bg_base64 = await asyncio.to_thread(
            remove_bg_base64, raw_result_base64
        )
        
        return GenerateResult(
            expression_id=expression.id,
            image_base64=clean_bg_base64,
            success=True
        )
    except Exception as e:
        logger.error(f"Error generating sticker for {expression.id}: {str(e)}")
        # Check if it was filtered by safety blocks
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
    api_key = get_api_key()
    if not api_key:
        raise HTTPException(status_code=500, detail="API key not configured")
        
    async def sse_generator() -> AsyncGenerator[str, None]:
        # Start all generation tasks in parallel
        tasks = [
            generate_single_sticker(request.image_base64, request.mime_type, expr, api_key)
            for expr in EXPRESSIONS
        ]

        
        # We can either await them as they complete using asyncio.as_completed
        # This allows sending SSE events as soon as any sticker finishes.
        for completed_task in asyncio.as_completed(tasks):
            try:
                result = await completed_task
                yield f"data: {result.model_dump_json()}\n\n"
            except Exception as e:
                logger.error(f"Unexpected error in parallel generation: {str(e)}")
                # generate_single_sticker already catches and returns GenerateResult for API errors,
                # so this would only catch truly unexpected asyncio errors
                pass
                
        # Send a final 'done' event
        yield "data: {\"done\": true}\n\n"

    return StreamingResponse(sse_generator(), media_type="text/event-stream")
