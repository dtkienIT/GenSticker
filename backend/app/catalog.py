from __future__ import annotations

from dataclasses import dataclass

from app.domain import SubjectType

CATALOG_VERSION = "v1"
EXPRESSION_KEYS = ("hello", "love", "ok", "happy", "sad", "surprised", "sleepy", "cheer")

_WORDING = {
    "vi": (
        "Xin chào!",
        "Yêu bạn!",
        "OK luôn!",
        "Haha!",
        "Buồn quá…",
        "Wow!",
        "Ngủ ngon!",
        "Cố lên!",
    ),
    "en": (
        "Hello!",
        "Love you!",
        "All good!",
        "Haha!",
        "So sad…",
        "Wow!",
        "Good night!",
        "You got this!",
    ),
}

_POSES = {
    SubjectType.PERSON: (
        "open-hand wave beside the shoulder",
        "hands forming a heart",
        "clear OK hand gesture",
        "joyful laugh",
        "sad downturned expression",
        "wide-eyed surprise",
        "sleeping while hugging a pillow",
        "encouraging raised fist",
    ),
    SubjectType.PET: (
        "friendly raised paw",
        "affectionate heart beside the cheek",
        "confident attentive pose",
        "happy play bow",
        "sad ears and gentle posture",
        "alert surprised ears",
        "curled natural sleeping pose",
        "excited tail and celebratory stance",
    ),
    SubjectType.OBJECT: (
        "gentle greeting motion marks",
        "small heart decoration",
        "confident approval sparkle",
        "joyful bounce with motion marks",
        "subtle sad rain mark",
        "surprised burst decoration",
        "resting pose with sleep marks",
        "celebratory confetti",
    ),
}


@dataclass(frozen=True, slots=True)
class CatalogItem:
    ordinal: int
    expression_key: str
    wording: str
    pose_prompt: str


def get_catalog(subject_type: SubjectType | str, locale: str) -> tuple[CatalogItem, ...]:
    subject = SubjectType(subject_type)
    language = locale if locale in _WORDING else "en"
    return tuple(
        CatalogItem(index + 1, key, _WORDING[language][index], _POSES[subject][index])
        for index, key in enumerate(EXPRESSION_KEYS)
    )
