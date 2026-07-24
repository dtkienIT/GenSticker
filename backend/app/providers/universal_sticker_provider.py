import asyncio
import gc
import threading
import time
import uuid
from io import BytesIO
from pathlib import Path
from typing import Any, Callable, Optional

import cv2
import numpy as np
from PIL import Image, ImageFilter

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

Segmenter = Callable[[Image.Image], Image.Image]


def _subject_canvas(
    image: Image.Image,
    mask: Image.Image,
    *,
    size: int,
    inner_size: int,
) -> tuple[Image.Image, Image.Image]:
    alpha = np.asarray(mask)
    ys, xs = np.where(alpha > settings.STICKER_MASK_THRESHOLD)
    if len(xs) == 0:
        raise GenStickerException(
            code="subject_not_found",
            message="No foreground subject was found in the uploaded image.",
            status_code=422,
        )

    x0, x1 = int(xs.min()), int(xs.max()) + 1
    y0, y1 = int(ys.min()), int(ys.max()) + 1
    padding = int(max(x1 - x0, y1 - y0) * settings.STICKER_CROP_PADDING_RATIO)
    box = (
        max(0, x0 - padding),
        max(0, y0 - padding),
        min(image.width, x1 + padding),
        min(image.height, y1 + padding),
    )
    subject = image.crop(box)
    subject_alpha = mask.crop(box)
    scale = min(inner_size / subject.width, inner_size / subject.height)
    resized_size = (
        max(1, round(subject.width * scale)),
        max(1, round(subject.height * scale)),
    )
    subject = subject.resize(resized_size, Image.Resampling.LANCZOS)
    subject_alpha = subject_alpha.resize(resized_size, Image.Resampling.LANCZOS)

    canvas = Image.new("RGB", (size, size), "white")
    canvas_alpha = Image.new("L", (size, size), 0)
    offset = ((size - resized_size[0]) // 2, (size - resized_size[1]) // 2)
    canvas.paste(subject, offset, subject_alpha)
    canvas_alpha.paste(subject_alpha, offset)
    return canvas, canvas_alpha


def _cartoonize(image: Image.Image) -> Image.Image:
    bgr = cv2.cvtColor(np.asarray(image), cv2.COLOR_RGB2BGR)
    smoothed = bgr.copy()
    for _ in range(3):
        smoothed = cv2.bilateralFilter(smoothed, 9, 55, 55)

    pixels = smoothed.reshape((-1, 3)).astype(np.float32)
    criteria = (
        cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER,
        20,
        1.0,
    )
    cv2.setRNGSeed(settings.STICKER_KMEANS_SEED)
    _, labels, centers = cv2.kmeans(
        pixels,
        settings.STICKER_COLOR_CLUSTERS,
        np.zeros((pixels.shape[0], 1), dtype=np.int32),
        criteria,
        1,
        cv2.KMEANS_PP_CENTERS,
    )
    quantized = centers.astype(np.uint8)[labels.flatten()].reshape(smoothed.shape)
    gray = cv2.cvtColor(smoothed, cv2.COLOR_BGR2GRAY)
    edges = cv2.adaptiveThreshold(
        cv2.medianBlur(gray, 5),
        255,
        cv2.ADAPTIVE_THRESH_MEAN_C,
        cv2.THRESH_BINARY,
        9,
        7,
    )
    outlined = cv2.bitwise_and(quantized, cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR))
    return Image.fromarray(cv2.cvtColor(outlined, cv2.COLOR_BGR2RGB))


def _finish_rgba(styled: Image.Image, alpha: Image.Image, outline_px: int) -> bytes:
    softened_alpha = alpha.filter(ImageFilter.GaussianBlur(0.8))
    kernel_size = max(3, outline_px * 2 + 1)
    if kernel_size % 2 == 0:
        kernel_size += 1
    outline_alpha = softened_alpha.filter(ImageFilter.MaxFilter(kernel_size))
    rgb = Image.composite(
        styled,
        Image.new("RGB", styled.size, "white"),
        softened_alpha,
    )
    result = Image.merge("RGBA", (*rgb.split(), outline_alpha))
    output = BytesIO()
    result.save(output, format="PNG", optimize=True)
    return output.getvalue()


class UniversalStickerProvider(GenerationProvider):
    """Local arbitrary-image to transparent sticker provider."""

    def __init__(
        self,
        *,
        model_path: str | Path | None = None,
        device: str | None = None,
        asset_store: AssetStore | None = None,
        segmenter: Segmenter | None = None,
    ) -> None:
        self.model_path = Path(model_path or settings.BIREFNET_MODEL_PATH).expanduser()
        self.device_name = (device or settings.STICKER_DEVICE).strip().lower()
        self.asset_store = asset_store or default_asset_store
        self._segmenter = segmenter
        self._model: Any | None = None
        self._torch: Any | None = None
        self._resolved_device: str | None = None
        self._lock = threading.Lock()

    def _load_model(self) -> None:
        if self._segmenter is not None or self._model is not None:
            return
        if not self.model_path.is_dir():
            raise ProviderNotConfiguredException(provider="birefnet")
        try:
            import torch
            from transformers import AutoModelForImageSegmentation  # type: ignore[import-untyped]
        except ImportError as exc:
            raise ProviderNotConfiguredException(provider="universal dependencies") from exc

        requested = self.device_name
        if requested not in {"auto", "cpu", "cuda"}:
            raise GenStickerException(
                code="invalid_sticker_device",
                message="STICKER_DEVICE must be one of: auto, cpu, cuda.",
                status_code=500,
            )
        resolved = "cuda" if requested == "auto" and torch.cuda.is_available() else requested
        if resolved == "auto":
            resolved = "cpu"
        if resolved == "cuda" and not torch.cuda.is_available():
            raise ProviderNotConfiguredException(provider="cuda")

        model = AutoModelForImageSegmentation.from_pretrained(
            str(self.model_path),
            trust_remote_code=True,
            local_files_only=True,
        )
        self._model = model.to(resolved).eval()
        self._torch = torch
        self._resolved_device = resolved

    def _segment(self, image: Image.Image) -> Image.Image:
        if self._segmenter is not None:
            mask = self._segmenter(image)
            return mask.convert("L").resize(image.size, Image.Resampling.LANCZOS)

        self._load_model()
        assert self._model is not None
        assert self._torch is not None
        assert self._resolved_device is not None

        resized = image.resize(
            (settings.BIREFNET_INPUT_SIZE, settings.BIREFNET_INPUT_SIZE),
            Image.Resampling.LANCZOS,
        )
        array = np.asarray(resized, dtype=np.float32) / 255.0
        mean = np.asarray([0.485, 0.456, 0.406], dtype=np.float32)
        std = np.asarray([0.229, 0.224, 0.225], dtype=np.float32)
        normalized = (array - mean) / std
        tensor = (
            self._torch.from_numpy(normalized.transpose(2, 0, 1))
            .unsqueeze(0)
            .to(self._resolved_device)
        )
        with self._torch.inference_mode():
            prediction = self._model(tensor)[-1].sigmoid().float().cpu()[0].squeeze().numpy()
        mask_array: np.ndarray = np.asarray(
            np.clip(prediction, 0.0, 1.0) * 255,
            dtype=np.uint8,
        )
        mask = Image.fromarray(mask_array)
        return mask.resize(image.size, Image.Resampling.LANCZOS)

    def _generate_png(self, source_path: Path) -> bytes:
        with self._lock:
            try:
                with Image.open(source_path) as source:
                    image = source.convert("RGB")
            except Exception as exc:
                raise GenStickerException(
                    code="invalid_source_image",
                    message="The generation source could not be decoded as an image.",
                    status_code=422,
                ) from exc

            mask = self._segment(image)
            canvas, canvas_alpha = _subject_canvas(
                image,
                mask,
                size=settings.STICKER_OUTPUT_SIZE,
                inner_size=settings.STICKER_INNER_SIZE,
            )
            styled = _cartoonize(canvas)
            return _finish_rgba(styled, canvas_alpha, settings.STICKER_OUTLINE_PX)

    async def generate(
        self,
        spec: GenerationSpec,
        progress_callback: Optional[ProgressCallback] = None,
    ) -> GenerationResult:
        if settings.STICKER_PROVIDER.strip().lower() != "universal":
            raise ProviderNotConfiguredException(provider=settings.STICKER_PROVIDER)
        if not spec.source_uri:
            return GenerationResult(
                success=False,
                provider="universal",
                workflow_version=spec.workflow_version,
                artifacts=[],
                error_code="invalid_job_request",
                error_message="Universal sticker generation requires one source image.",
            )
        source_path = Path(spec.source_uri)
        if not source_path.is_file():
            return GenerationResult(
                success=False,
                provider="universal",
                workflow_version=spec.workflow_version,
                artifacts=[],
                error_code="source_asset_unavailable",
                error_message="The private source image is unavailable to the worker.",
            )

        if progress_callback:
            progress_callback(GenerationStage.PREPARING, 15)
            progress_callback(GenerationStage.BACKGROUND_REMOVAL, 35)
        started_at = time.perf_counter()
        png_bytes = await asyncio.to_thread(self._generate_png, source_path)
        inference_seconds = time.perf_counter() - started_at
        if progress_callback:
            progress_callback(GenerationStage.POSTPROCESSING, 90)

        stored = self.asset_store.save_bytes(
            png_bytes,
            user_id=spec.user_id,
            extension=".png",
            asset_subfolder="stickers",
        )
        artifact = GenerationArtifact(
            asset_id=str(uuid.uuid4()),
            relative_path=stored.relative_path,
            mime_type=stored.mime_type,
            byte_size=stored.byte_size,
            sha256=stored.sha256,
            width=stored.width or settings.STICKER_OUTPUT_SIZE,
            height=stored.height or settings.STICKER_OUTPUT_SIZE,
            variant_name="universal_sticker",
        )
        if progress_callback:
            progress_callback(GenerationStage.COMPLETED, 100)
        if self._resolved_device == "cuda" and self._torch is not None:
            self._torch.cuda.empty_cache()
        gc.collect()
        return GenerationResult(
            success=True,
            provider="universal",
            workflow_version=spec.workflow_version,
            artifacts=[artifact],
            metrics={
                "gpu_seconds": inference_seconds if self._resolved_device == "cuda" else 0.0,
                "inference_seconds": round(inference_seconds, 4),
                "device": self._resolved_device or self.device_name,
                "candidate_count": 1,
            },
        )
