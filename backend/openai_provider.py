import json
import base64
import requests
import logging
from typing import Dict, Any
from models import ExpressionConfig
from prompts import get_sticker_prompt, VALIDATION_PROMPT

logger = logging.getLogger(__name__)

DEFAULT_OPENAI_IMAGE_MODEL = "dall-e-3"
DEFAULT_OPENAI_VISION_MODEL = "gpt-4o-mini"

def call_openai_validation(
    image_base64: str,
    mime_type: str,
    api_key: str,
    model: str = DEFAULT_OPENAI_VISION_MODEL
) -> Dict[str, Any]:
    """
    Validates uploaded photo using OpenAI Vision model (gpt-4o / gpt-4o-mini).
    """
    url = "https://api.openai.com/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    clean_b64 = image_base64.split(",")[-1] if "," in image_base64 else image_base64
    data_uri = f"data:{mime_type};base64,{clean_b64}"

    prompt_text = (
        f"{VALIDATION_PROMPT}\n\n"
        "Return ONLY a valid JSON object matching this schema: "
        '{"face_count": int, "has_clear_face": bool, "image_quality": "good"|"poor"|"blurry"|"dark", '
        '"is_safe": bool, "safety_reason": str|null, "subject_type": "person"|"pet"|"object"|"multiple_people"|"unknown"}.'
    )

    payload = {
        "model": model,
        "response_format": {"type": "json_object"},
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt_text},
                    {"type": "image_url", "image_url": {"url": data_uri}}
                ]
            }
        ]
    }

    response = requests.post(url, headers=headers, json=payload, timeout=30)
    if response.status_code != 200:
        logger.error(f"OpenAI Vision API Error ({response.status_code}): {response.text}")
        raise Exception(f"OpenAI Vision API error ({response.status_code}): {response.text}")

    res_json = response.json()
    result_text = res_json["choices"][0]["message"]["content"]
    return json.loads(result_text)


def call_openai_generation(
    image_base64: str,
    mime_type: str,
    expression: ExpressionConfig,
    api_key: str,
    model: str = DEFAULT_OPENAI_IMAGE_MODEL
) -> str:
    """
    Generates a sticker variant using OpenAI DALL-E 3 API.
    """
    url = "https://api.openai.com/v1/images/generations"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    prompt = get_sticker_prompt(expression)

    payload = {
        "model": model,
        "prompt": prompt,
        "n": 1,
        "size": "1024x1024",
        "response_format": "b64_json"
    }

    response = requests.post(url, headers=headers, json=payload, timeout=60)
    if response.status_code != 200:
        logger.error(f"OpenAI Image API Error ({response.status_code}): {response.text}")
        raise Exception(f"OpenAI Image API error ({response.status_code}): {response.text}")

    res_json = response.json()
    img_b64 = res_json["data"][0]["b64_json"]
    return img_b64
