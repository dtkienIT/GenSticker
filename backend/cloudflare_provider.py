import json
import base64
import requests
import logging
from typing import Dict, Any
from models import ExpressionConfig
from prompts import get_sticker_prompt, VALIDATION_PROMPT

logger = logging.getLogger(__name__)

# Default Cloudflare Workers AI Models
DEFAULT_CF_IMAGE_MODEL = "@cf/black-forest-labs/flux-1-schnell"
DEFAULT_CF_VISION_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct"

def call_cloudflare_validation(
    image_base64: str, 
    mime_type: str, 
    account_id: str, 
    api_token: str, 
    model: str = DEFAULT_CF_VISION_MODEL
) -> Dict[str, Any]:
    """
    Validates uploaded photo using Cloudflare Workers AI Vision model.
    """
    url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/{model}"
    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json"
    }

    # Convert base64 to uint8 byte array or base64 data URI as expected by Workers AI Vision
    clean_b64 = image_base64.split(",")[-1] if "," in image_base64 else image_base64
    image_bytes = list(base64.b64decode(clean_b64))

    prompt_text = (
        f"{VALIDATION_PROMPT}\n\n"
        "Return ONLY a valid JSON object matching the requested schema. "
        "Do not include markdown codeblocks or extra text."
    )

    payload = {
        "prompt": prompt_text,
        "image": image_bytes
    }

    response = requests.post(url, headers=headers, json=payload, timeout=30)
    if response.status_code != 200:
        logger.error(f"Cloudflare Vision API Error ({response.status_code}): {response.text}")
        raise Exception(f"Cloudflare Vision API error ({response.status_code}): {response.text}")

    res_json = response.json()
    result_text = res_json.get("result", {}).get("response", "")
    
    # Clean potential markdown formatting
    clean_text = result_text.replace("```json", "").replace("```", "").strip()
    return json.loads(clean_text)


def call_cloudflare_generation(
    image_base64: str,
    mime_type: str,
    expression: ExpressionConfig,
    account_id: str,
    api_token: str,
    model: str = DEFAULT_CF_IMAGE_MODEL
) -> str:
    """
    Generates a sticker variant using Cloudflare Workers AI Image model.
    """
    url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/{model}"
    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json"
    }

    prompt = get_sticker_prompt(expression)

    payload = {
        "prompt": prompt,
        "num_steps": 4 if "schnell" in model else 20,
        "guidance": 7.5
    }

    response = requests.post(url, headers=headers, json=payload, timeout=60)
    if response.status_code != 200:
        logger.error(f"Cloudflare Image API Error ({response.status_code}): {response.text}")
        raise Exception(f"Cloudflare Image API error ({response.status_code}): {response.text}")

    # Cloudflare returns binary image bytes (JPEG/PNG) or JSON response
    content_type = response.headers.get("Content-Type", "")
    if "image/" in content_type:
        return base64.b64encode(response.content).decode("utf-8")
    else:
        res_json = response.json()
        img_b64 = res_json.get("result", {}).get("image", "")
        if not img_b64:
            raise Exception("Cloudflare API did not return image data")
        return img_b64
