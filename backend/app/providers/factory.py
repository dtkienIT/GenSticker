from functools import lru_cache

from backend.app.providers.base import GenerationProvider
from backend.app.providers.universal_sticker_provider import UniversalStickerProvider


@lru_cache(maxsize=1)
def get_generation_provider() -> GenerationProvider:
    return UniversalStickerProvider()
