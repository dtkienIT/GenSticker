import asyncio
import base64
import inspect
import uuid
from io import BytesIO
from typing import Any, Callable, Optional
from urllib.parse import unquote_to_bytes

import httpx
import replicate
from PIL import Image as PILImage

from backend.app.core.config import settings
from backend.app.core.errors import GenStickerException, ProviderNotConfiguredException
from backend.app.providers.base import (
    GenerationArtifact,
    GenerationProvider,
    GenerationResult,
    GenerationSpec,
    GenerationStage,
    ProgressCallback,
)
from backend.app.storage.asset_store import AssetStore, default_asset_store

FACE_TO_STICKER_MODEL = (
    "fofr/face-to-sticker:764d4827ea159608a07cdde8ddf1c6000019627515eb02b6b449695fd547e5ef"
)
STICKER_MAKER_MODEL = (
    "fofr/sticker-maker:4acb778eb059772225ec213948f0660867b2e03f277448f18cf1800b96a65a1a"
)


class ReplicateGenerationProvider(GenerationProvider):
    def __init__(
        self,
        api_token: Optional[str] = None,
        *,
        client: Any = None,
        asset_store: Optional[AssetStore] = None,
        http_client_factory: Optional[Callable[[], Any]] = None,
    ):
        self.api_token = api_token if api_token is not None else settings.REPLICATE_API_TOKEN
        self.asset_store = asset_store if asset_store is not None else default_asset_store
        self.http_client_factory = http_client_factory or (
            lambda: httpx.AsyncClient(follow_redirects=True, timeout=30.0)
        )
        self.client = client
        if self.client is None and self.api_token:
            client_type = getattr(replicate, "Client", None)
            if not callable(client_type):
                raise ProviderNotConfiguredException(provider="replicate")
            self.client = client_type(api_token=self.api_token)

    async def generate(
        self,
        spec: GenerationSpec,
        progress_callback: Optional[ProgressCallback] = None,
    ) -> GenerationResult:
        if self.client is None:
            raise ProviderNotConfiguredException(provider="replicate")

        try:
            is_face_request = (
                spec.kind == "selfie_to_sticker"
                or spec.source_uri is not None
                or spec.source_asset_id is not None
            )
            if is_face_request:
                return await self._generate_face_to_sticker(spec, progress_callback)
            return await self._generate_text_to_sticker(spec, progress_callback)
        except GenStickerException as exc:
            return self._failed_result(spec, exc.code, exc.message)
        except Exception:
            return self._failed_result(
                spec,
                "provider_unavailable",
                "The Replicate generation provider is currently unavailable.",
            )

    async def _generate_face_to_sticker(
        self,
        spec: GenerationSpec,
        progress_callback: Optional[ProgressCallback],
    ) -> GenerationResult:
        if not spec.source_uri:
            raise GenStickerException(
                code="invalid_job_request",
                message="A source image URI is required for selfie generation.",
                status_code=400,
            )

        self._emit(progress_callback, GenerationStage.PREPARING, 10)
        self._emit(progress_callback, GenerationStage.GENERATING, 40)
        output = await asyncio.to_thread(
            self.client.run,
            FACE_TO_STICKER_MODEL,
            input={
                "image": spec.source_uri,
                "prompt": spec.prompt or f"a {spec.style} sticker of a person, {spec.emotion}",
                "negative_prompt": "low quality, blurry, distorted",
                "seed": spec.seed,
                "upscale": True,
                "upscale_steps": 10,
            },
        )
        return await self._process_output(output, spec, progress_callback)

    async def _generate_text_to_sticker(
        self,
        spec: GenerationSpec,
        progress_callback: Optional[ProgressCallback],
    ) -> GenerationResult:
        self._emit(progress_callback, GenerationStage.PREPARING, 10)
        self._emit(progress_callback, GenerationStage.GENERATING, 40)
        output = await asyncio.to_thread(
            self.client.run,
            STICKER_MAKER_MODEL,
            input={
                "prompt": spec.prompt or f"a {spec.style} sticker, {spec.emotion}",
                "negative_prompt": "low quality, blurry, distorted",
                "seed": spec.seed,
                "steps": 17,
                "number_of_images": 1,
                "output_format": "png",
                "output_quality": 100,
            },
        )
        return await self._process_output(output, spec, progress_callback)

    async def _process_output(
        self,
        output: Any,
        spec: GenerationSpec,
        progress_callback: Optional[ProgressCallback],
    ) -> GenerationResult:
        output_items = self._normalize_output(output)
        if not output_items:
            raise GenStickerException(
                code="generation_failed",
                message="Replicate completed without returning an image.",
                status_code=502,
            )

        self._emit(progress_callback, GenerationStage.POSTPROCESSING, 80)
        artifacts: list[GenerationArtifact] = []
        try:
            for index, output_item in enumerate(output_items, start=1):
                content = await self._read_output_bytes(output_item)
                if not content:
                    raise GenStickerException(
                        code="generation_failed",
                        message="Replicate returned an empty image.",
                        status_code=502,
                    )

                try:
                    stored = self.asset_store.save_bytes(
                        content,
                        spec.user_id,
                        extension=self._detect_image_extension(content),
                        asset_subfolder="generated",
                    )
                except GenStickerException as exc:
                    if exc.code == "storage_write_failed":
                        raise
                    raise GenStickerException(
                        code="generation_failed",
                        message="Replicate returned an invalid image.",
                        status_code=502,
                    ) from exc
                except Exception as exc:
                    raise GenStickerException(
                        code="storage_write_failed",
                        message="Generated image content could not be stored.",
                        status_code=500,
                    ) from exc

                artifacts.append(
                    GenerationArtifact(
                        asset_id=str(uuid.uuid4()),
                        relative_path=stored.relative_path,
                        mime_type=stored.mime_type,
                        byte_size=stored.byte_size,
                        sha256=stored.sha256,
                        width=stored.width or 0,
                        height=stored.height or 0,
                        variant_name=f"candidate_{index}",
                    )
                )
        except Exception:
            for artifact in artifacts:
                try:
                    self.asset_store.delete_asset(artifact.relative_path)
                except Exception:
                    pass
            raise

        self._emit(progress_callback, GenerationStage.COMPLETED, 100)
        return GenerationResult(
            success=True,
            provider="replicate",
            workflow_version=spec.workflow_version,
            artifacts=artifacts,
            metrics={"candidate_count": len(artifacts)},
        )

    async def _read_output_bytes(self, output_item: Any) -> bytes:
        if isinstance(output_item, (bytes, bytearray, memoryview)):
            return bytes(output_item)

        read = getattr(output_item, "read", None)
        if callable(read):
            try:
                content = await asyncio.to_thread(read)
                if inspect.isawaitable(content):
                    content = await content
                if isinstance(content, (bytes, bytearray, memoryview)):
                    return bytes(content)
            except Exception:
                # FileOutput also exposes an expiring URL; use it as a fallback.
                pass

        output_url: Any = output_item if isinstance(output_item, str) else None
        if output_url is None:
            output_url = getattr(output_item, "url", None)
            if callable(output_url):
                output_url = output_url()
        if output_url is not None and not isinstance(output_url, str):
            output_url = str(output_url)
        if not isinstance(output_url, str) or not output_url:
            raise GenStickerException(
                code="generation_failed",
                message="Replicate returned an unsupported output type.",
                status_code=502,
            )
        return await self._download_output(output_url)

    async def _download_output(self, output_url: str) -> bytes:
        if output_url.startswith("data:"):
            try:
                header, payload = output_url.split(",", 1)
                if ";base64" in header:
                    return base64.b64decode(payload, validate=True)
                return unquote_to_bytes(payload)
            except (ValueError, TypeError) as exc:
                raise GenStickerException(
                    code="generation_failed",
                    message="Replicate returned an invalid data URL.",
                    status_code=502,
                ) from exc

        if not output_url.startswith(("https://", "http://")):
            raise GenStickerException(
                code="generation_failed",
                message="Replicate returned an invalid output URL.",
                status_code=502,
            )

        try:
            async with self.http_client_factory() as client:
                response = await client.get(output_url)
                response.raise_for_status()
                return bytes(response.content)
        except GenStickerException:
            raise
        except Exception as exc:
            raise GenStickerException(
                code="provider_unavailable",
                message="Replicate output could not be downloaded.",
                status_code=503,
            ) from exc

    @staticmethod
    def _normalize_output(output: Any) -> list[Any]:
        if output is None:
            return []
        if isinstance(output, (list, tuple)):
            return list(output)
        return [output]

    @staticmethod
    def _detect_image_extension(content: bytes) -> str:
        try:
            with PILImage.open(BytesIO(content)) as image:
                return {
                    "JPEG": ".jpg",
                    "PNG": ".png",
                    "WEBP": ".webp",
                }.get((image.format or "").upper(), ".png")
        except Exception as exc:
            raise GenStickerException(
                code="generation_failed",
                message="Replicate returned an invalid image.",
                status_code=502,
            ) from exc

    @staticmethod
    def _emit(
        progress_callback: Optional[ProgressCallback],
        stage: GenerationStage,
        progress: int,
    ) -> None:
        if progress_callback:
            progress_callback(stage, progress)

    @staticmethod
    def _failed_result(
        spec: GenerationSpec,
        error_code: str,
        error_message: str,
    ) -> GenerationResult:
        return GenerationResult(
            success=False,
            provider="replicate",
            workflow_version=spec.workflow_version,
            artifacts=[],
            error_code=error_code,
            error_message=error_message,
        )
