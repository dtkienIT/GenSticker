from functools import lru_cache

from backend.app.providers.base import GenerationProvider
from backend.app.providers.instantid_provider import InstantIDStickerProvider


@lru_cache(maxsize=1)
def get_generation_provider() -> GenerationProvider:
    return InstantIDStickerProvider()
