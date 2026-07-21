from backend.app.core.config import settings
from backend.app.providers.base import GenerationProvider
from backend.app.providers.comfyui_provider import ComfyUIGenerationProvider
from backend.app.providers.mock_provider import MockGenerationProvider
from backend.app.providers.replicate_provider import ReplicateGenerationProvider


def get_generation_provider() -> GenerationProvider:
    provider_name = settings.GENERATION_PROVIDER.lower()

    if provider_name == "replicate":
        return ReplicateGenerationProvider()
    elif provider_name == "comfyui":
        return ComfyUIGenerationProvider()
    return MockGenerationProvider()
