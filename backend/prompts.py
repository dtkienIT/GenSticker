from models import ExpressionConfig

EXPRESSIONS = [
    ExpressionConfig(
        id="happy",
        name_en="Happy/Smiling",
        name_vi="Vui vẻ",
        emoji="😊",
        prompt_modifier="big happy smile, joyful expression",
        color="#FFD700"
    ),
    ExpressionConfig(
        id="laughing",
        name_en="Laughing/LOL",
        name_vi="Cười to",
        emoji="😂",
        prompt_modifier="laughing out loud, hilarious, tear of joy",
        color="#FF8C00"
    ),
    ExpressionConfig(
        id="love",
        name_en="Love/Heart Eyes",
        name_vi="Yêu thích",
        emoji="😍",
        prompt_modifier="heart eyes, deeply in love, affectionate",
        color="#FF69B4"
    ),
    ExpressionConfig(
        id="sad",
        name_en="Sad/Crying",
        name_vi="Buồn bã",
        emoji="😢",
        prompt_modifier="sad, crying, tears on cheeks, looking down",
        color="#6495ED"
    ),
    ExpressionConfig(
        id="angry",
        name_en="Angry/Frustrated",
        name_vi="Tức giận",
        emoji="😡",
        prompt_modifier="angry, frustrated, red face, steam from ears",
        color="#E74C3C"
    ),
    ExpressionConfig(
        id="surprised",
        name_en="Surprised/Shocked",
        name_vi="Bất ngờ",
        emoji="😲",
        prompt_modifier="surprised, shocked, wide eyes, open mouth",
        color="#9B59B6"
    ),
    ExpressionConfig(
        id="thumbsup",
        name_en="Thumbs Up/OK",
        name_vi="Đồng ý",
        emoji="👍",
        prompt_modifier="thumbs up gesture, confident, approving",
        color="#2ECC71"
    ),
    ExpressionConfig(
        id="sleepy",
        name_en="Sleepy/Tired",
        name_vi="Buồn ngủ",
        emoji="😴",
        prompt_modifier="sleepy, tired, yawning, sleepy bubble from nose",
        color="#B39DDB"
    )
]

def get_sticker_prompt(expression: ExpressionConfig) -> str:
    return f"""Create a cute chibi/kawaii cartoon sticker character based EXACTLY on the person in the provided photo.
Maintain the person's key identifying features (hair color, hair style, skin tone, glasses, and facial structure).

Style requirements:
- Cute chibi/kawaii cartoon style
- Big round head (about 50% of total body height)
- Small stubby body
- Very large, expressive eyes
- Round proportions
- Bright, saturated colors
- Thick, clean outlines suitable for a sticker

Pose and Expression:
- {expression.prompt_modifier}

Composition:
- The character MUST be perfectly centered
- Full-body visible
- Solid white or completely transparent background
- NO text, NO words, NO letters in the image
- Clean sticker-ready composition
"""

VALIDATION_PROMPT = """Analyze the provided photo and return a JSON object with the following fields:
- face_count (integer): Number of human faces detected.
- has_clear_face (boolean): True if there is a clear, visible human face.
- image_quality (string): One of "good", "poor", "blurry", or "dark".
- is_safe (boolean): True if the image is safe for work and contains no explicit, offensive, or inappropriate content.
- safety_reason (string or null): If is_safe is false, a brief reason why. Otherwise null.
- subject_type (string): One of "person", "pet", "object", "multiple_people", or "unknown".
"""
