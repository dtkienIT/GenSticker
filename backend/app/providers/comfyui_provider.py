from typing import Callable, Optional

from backend.app.core.config import settings
from backend.app.core.errors import ProviderNotConfiguredException
from backend.app.providers.base import (
    GenerationProvider,
    GenerationResult,
    GenerationSpec,
)


class ComfyUIGenerationProvider(GenerationProvider):
    def __init__(self, base_url: Optional[str] = None, enabled: Optional[bool] = None):
        self.base_url = base_url or settings.COMFYUI_BASE_URL
        self.enabled = enabled if enabled is not None else settings.COMFYUI_ENABLED

    async def generate(
        self,
        spec: GenerationSpec,
        progress_callback: Optional[Callable[[str, int], None]] = None,
    ) -> GenerationResult:
        if not self.enabled:
            raise ProviderNotConfiguredException(provider="comfyui")

        # Seam skeleton for future ComfyUI websocket/API client implementation
        raise ProviderNotConfiguredException(
            provider="comfyui (Real inference execution is disabled in this technical foundation phase)"
        )
