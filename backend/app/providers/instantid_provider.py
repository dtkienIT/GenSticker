import asyncio
import gc
import importlib
import sys
import threading
import time
import uuid
from io import BytesIO
from pathlib import Path
from typing import Any, Optional, Protocol

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

DEFAULT_PROMPT = (
    "Sticker, adorable 2D kawaii chibi of the same person, oversized round head, "
    "enormous sparkling eyes, tiny nose and mouth, round cheeks, flat vector shapes, "
    "face and hair only, exact reference hairstyle above chin, same hair color, "
    "hairline, parting and texture, hair ends at chin, pastel matte colors, "
    "soft neutral light, thick white outline, plain background"
)

DEFAULT_NEGATIVE_PROMPT = (
    "photo, photorealistic, semi-realistic portrait, adult proportions, realistic skin, "
    "pores, glossy shine, overexposed, orange cast, harsh contrast, detailed nose, "
    "detailed lips, 3d, changed hairstyle, extra volume, hair below chin, headwear, "
    "decorations, neck, shoulders, body, text, watermark"
)


class InstantIDRuntime(Protocol):
    device: str

    def detect_faces(self, image: Image.Image) -> list[Any]: ...

    def draw_keypoints(self, image: Image.Image, face: Any) -> Image.Image: ...

    def generate(
        self,
        *,
        prompt: str,
        negative_prompt: str,
        face_embedding: Any,
        keypoints: Image.Image,
        hair_canny: Image.Image,
        seed: int,
        size: int,
    ) -> Image.Image: ...

    def segment(self, image: Image.Image) -> Image.Image: ...

    def clear_cuda_cache(self) -> None: ...


def _bbox(face: Any) -> tuple[float, float, float, float]:
    values = np.asarray(face.bbox, dtype=np.float32).reshape(-1)
    if values.size != 4:
        raise GenStickerException(
            code="invalid_face_geometry",
            message="The detected face bounding box is invalid.",
            status_code=422,
        )
    return tuple(float(value) for value in values)  # type: ignore[return-value]


def _require_one_face(faces: list[Any], *, context: str) -> Any:
    if not faces:
        raise GenStickerException(
            code="face_not_found",
            message=f"No face was detected in the {context}. Use a clear single-person portrait.",
            status_code=422,
        )
    if len(faces) > 1:
        raise GenStickerException(
            code="multiple_faces_not_supported",
            message=(
                "This pipeline currently supports exactly one person; "
                f"{len(faces)} faces were detected in the {context}."
            ),
            status_code=422,
            details={"faces_detected": len(faces), "context": context},
        )
    return faces[0]


def crop_face_context(
    image: Image.Image,
    face: Any,
    *,
    scale: float,
    output_size: int,
) -> Image.Image:
    x0, y0, x1, y1 = _bbox(face)
    cx, cy = (x0 + x1) / 2.0, (y0 + y1) / 2.0
    side = max(x1 - x0, y1 - y0) * scale
    box = (
        int(cx - side / 2.0),
        int(cy - side * 0.52),
        int(cx + side / 2.0),
        int(cy + side * 0.48),
    )
    crop = Image.new(
        "RGB",
        (max(1, box[2] - box[0]), max(1, box[3] - box[1])),
        "white",
    )
    valid = (
        max(0, box[0]),
        max(0, box[1]),
        min(image.width, box[2]),
        min(image.height, box[3]),
    )
    if valid[2] > valid[0] and valid[3] > valid[1]:
        patch = image.crop(valid)
        crop.paste(patch, (valid[0] - box[0], valid[1] - box[1]))
    return crop.resize((output_size, output_size), Image.Resampling.LANCZOS)


def build_hair_canny(reference: Image.Image, face: Any) -> Image.Image:
    rgb = np.asarray(reference)
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    edges = cv2.Canny(
        gray,
        settings.STICKER_CANNY_LOW_THRESHOLD,
        settings.STICKER_CANNY_HIGH_THRESHOLD,
    )
    fx0, fy0, fx1, fy1 = (int(value) for value in _bbox(face))
    fw, fh = max(1, fx1 - fx0), max(1, fy1 - fy0)

    roi = np.zeros_like(edges)
    rx0 = max(0, fx0 - int(1.2 * fw))
    ry0 = max(0, fy0 - int(1.1 * fh))
    rx1 = min(edges.shape[1], fx1 + int(1.2 * fw))
    ry1 = min(edges.shape[0], fy1 + int(1.3 * fh))
    roi[ry0:ry1, rx0:rx1] = 255

    dark_support = cv2.dilate(
        (gray < settings.STICKER_HAIR_DARK_THRESHOLD).astype(np.uint8) * 255,
        np.ones((15, 15), np.uint8),
    )
    face_hole = np.zeros_like(edges)
    cv2.ellipse(
        face_hole,
        (
            int((fx0 + fx1) / 2),
            int((fy0 + fy1) / 2 + 0.08 * fh),
        ),
        (int(0.38 * fw), int(0.48 * fh)),
        0,
        0,
        360,
        255,
        -1,
    )

    hair_edges = cv2.bitwise_and(edges, roi)
    hair_edges = cv2.bitwise_and(hair_edges, dark_support)
    hair_edges[face_hole > 0] = 0
    hair_limit_y = int(min(hair_edges.shape[0], fy1 + 0.02 * fh))
    hair_edges[hair_limit_y:, :] = 0
    hair_edges = cv2.dilate(
        hair_edges,
        np.ones((3, 3), np.uint8),
        iterations=1,
    )
    return Image.fromarray(np.repeat(hair_edges[:, :, None], 3, axis=2))


def trim_subject_to_chin(mask: Image.Image, face: Any) -> Image.Image:
    _, y0, _, y1 = _bbox(face)
    face_height = max(1.0, y1 - y0)
    limit_y = int(min(mask.height, y1 + 0.02 * face_height))
    fade = max(8, int(0.035 * face_height))
    start_y = max(0, limit_y - fade)

    alpha = np.asarray(mask.convert("L"), dtype=np.float32).copy()
    if limit_y > start_y:
        ramp = np.linspace(1.0, 0.0, limit_y - start_y, dtype=np.float32)[:, None]
        alpha[start_y:limit_y, :] *= ramp
    alpha[limit_y:, :] = 0
    return Image.fromarray(np.clip(alpha, 0, 255).astype(np.uint8))


def adaptive_soft_tone(image: Image.Image, mask: Image.Image) -> tuple[Image.Image, float]:
    rgb = np.asarray(image.convert("RGB"), dtype=np.float32)
    valid = np.asarray(mask.convert("L")) > settings.STICKER_MASK_THRESHOLD
    gain = 1.0
    if np.any(valid):
        luminance = (
            0.2126 * rgb[:, :, 0]
            + 0.7152 * rgb[:, :, 1]
            + 0.0722 * rgb[:, :, 2]
        )
        p95 = float(np.percentile(luminance[valid], 95))
        gain = float(
            np.clip(
                settings.STICKER_TONE_TARGET_P95 / max(p95, 1.0),
                settings.STICKER_TONE_MIN_GAIN,
                1.0,
            )
        )

    rgb *= gain
    gray = (
        0.2126 * rgb[:, :, 0]
        + 0.7152 * rgb[:, :, 1]
        + 0.0722 * rgb[:, :, 2]
    )
    desaturation = settings.STICKER_TONE_DESATURATION
    rgb = (1.0 - desaturation) * rgb + desaturation * gray[:, :, None]
    return Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8)), gain


def compose_sticker(
    raw: Image.Image,
    mask: Image.Image,
    generated_face: Any | None,
) -> tuple[Image.Image, float]:
    normalized_mask = mask.convert("L").resize(raw.size, Image.Resampling.LANCZOS)
    if generated_face is not None:
        normalized_mask = trim_subject_to_chin(normalized_mask, generated_face)
    normalized_mask = normalized_mask.filter(ImageFilter.GaussianBlur(0.8))
    if generated_face is not None:
        normalized_mask = trim_subject_to_chin(normalized_mask, generated_face)
    if not np.any(
        np.asarray(normalized_mask, dtype=np.uint8) > settings.STICKER_MASK_THRESHOLD
    ):
        raise GenStickerException(
            code="subject_not_found",
            message="No foreground subject remained after background removal.",
            status_code=422,
        )

    kernel_size = max(3, settings.STICKER_OUTLINE_PX * 2 + 1)
    if kernel_size % 2 == 0:
        kernel_size += 1
    outline = normalized_mask.filter(ImageFilter.MaxFilter(kernel_size))
    if generated_face is not None:
        outline = trim_subject_to_chin(outline, generated_face)

    toned, gain = adaptive_soft_tone(raw, normalized_mask)
    white = Image.new("RGBA", raw.size, (255, 255, 255, 0))
    white.putalpha(outline)
    subject = toned.convert("RGBA")
    subject.putalpha(normalized_mask)
    return Image.alpha_composite(white, subject), gain


def _identity_similarity(reference_face: Any, generated_face: Any | None) -> float:
    if generated_face is None:
        return -1.0
    reference = getattr(reference_face, "normed_embedding", None)
    generated = getattr(generated_face, "normed_embedding", None)
    if reference is None or generated is None:
        return -1.0
    reference_array = np.asarray(reference, dtype=np.float32).reshape(-1)
    generated_array = np.asarray(generated, dtype=np.float32).reshape(-1)
    if reference_array.size == 0 or reference_array.shape != generated_array.shape:
        return -1.0
    return float(np.dot(reference_array, generated_array))


class LocalInstantIDRuntime:
    """Lazy, process-local SDXL + InstantID + BiRefNet runtime."""

    def __init__(self) -> None:
        self.device = "cuda"
        self._torch: Any | None = None
        self._face_app: Any | None = None
        self._draw_kps: Any | None = None
        self._pipe: Any | None = None
        self._biref: Any | None = None
        self._segmenter_device: str | None = None

    @staticmethod
    def _asset_paths() -> dict[str, Path]:
        instant_dir = Path(settings.INSTANTID_MODEL_PATH).expanduser()
        canny_dir = Path(settings.CANNY_CONTROLNET_MODEL_PATH).expanduser()
        face_root = Path(settings.INSIGHTFACE_MODEL_ROOT).expanduser()
        return {
            "instantid_pipeline": Path(settings.INSTANTID_REPO_PATH).expanduser()
            / "pipeline_stable_diffusion_xl_instantid_full.py",
            "sdxl": Path(settings.SDXL_MODEL_PATH).expanduser() / "model_index.json",
            "instantid_controlnet_config": instant_dir / "ControlNetModel" / "config.json",
            "instantid_controlnet_weights": instant_dir
            / "ControlNetModel"
            / "diffusion_pytorch_model.safetensors",
            "instantid_adapter": instant_dir / "ip-adapter.bin",
            "canny_config": canny_dir / "config.json",
            "canny_weights": canny_dir / "diffusion_pytorch_model.safetensors",
            "insightface_recognition": face_root / "models" / "antelopev2" / "glintr100.onnx",
            "insightface_detection": face_root
            / "models"
            / "antelopev2"
            / "scrfd_10g_bnkps.onnx",
            "chibi_lora": Path(settings.CHIBI_LORA_PATH).expanduser(),
            "birefnet_config": Path(settings.BIREFNET_MODEL_PATH).expanduser()
            / "config.json",
            "birefnet_weights": Path(settings.BIREFNET_MODEL_PATH).expanduser()
            / "model.safetensors",
        }

    def _validate_assets(self) -> None:
        missing = [
            f"{name}={path}"
            for name, path in self._asset_paths().items()
            if not path.is_file()
        ]
        if missing:
            raise GenStickerException(
                code="provider_not_configured",
                message="InstantID model assets are incomplete.",
                status_code=503,
                details={"missing": missing},
            )

    def _load(self) -> None:
        if self._pipe is not None:
            return
        self._validate_assets()
        try:
            import torch
            from diffusers import ControlNetModel, DPMSolverMultistepScheduler
            from insightface.app import FaceAnalysis
        except ImportError as exc:
            raise ProviderNotConfiguredException(provider="instantid dependencies") from exc

        requested_device = settings.STICKER_DEVICE.strip().lower()
        if requested_device not in {"auto", "cuda"}:
            raise GenStickerException(
                code="invalid_sticker_device",
                message="The InstantID provider requires STICKER_DEVICE=auto or cuda.",
                status_code=500,
            )
        if not torch.cuda.is_available():
            raise ProviderNotConfiguredException(provider="cuda")

        repo_path = Path(settings.INSTANTID_REPO_PATH).expanduser().resolve()
        repo_value = str(repo_path)
        if repo_value not in sys.path:
            sys.path.insert(0, repo_value)
        instantid_module = importlib.import_module(
            "pipeline_stable_diffusion_xl_instantid_full"
        )
        pipeline_class = instantid_module.StableDiffusionXLInstantIDPipeline
        self._draw_kps = instantid_module.draw_kps

        face_app = FaceAnalysis(
            name="antelopev2",
            root=str(Path(settings.INSIGHTFACE_MODEL_ROOT).expanduser()),
            providers=["CUDAExecutionProvider", "CPUExecutionProvider"],
        )
        face_app.prepare(
            ctx_id=0,
            det_size=(
                settings.STICKER_FACE_DETECTION_SIZE,
                settings.STICKER_FACE_DETECTION_SIZE,
            ),
        )

        identity_controlnet = ControlNetModel.from_pretrained(
            str(Path(settings.INSTANTID_MODEL_PATH).expanduser() / "ControlNetModel"),
            torch_dtype=torch.float16,
            use_safetensors=True,
            local_files_only=True,
        )
        canny_controlnet = ControlNetModel.from_pretrained(
            str(Path(settings.CANNY_CONTROLNET_MODEL_PATH).expanduser()),
            torch_dtype=torch.float16,
            use_safetensors=True,
            local_files_only=True,
        )
        pipe = pipeline_class.from_pretrained(
            str(Path(settings.SDXL_MODEL_PATH).expanduser()),
            controlnet=[identity_controlnet, canny_controlnet],
            torch_dtype=torch.float16,
            variant="fp16",
            use_safetensors=True,
            local_files_only=True,
        )
        pipe.scheduler = DPMSolverMultistepScheduler.from_config(
            pipe.scheduler.config,
            algorithm_type="sde-dpmsolver++",
            use_karras_sigmas=True,
        )
        pipe.load_ip_adapter_instantid(
            str(Path(settings.INSTANTID_MODEL_PATH).expanduser() / "ip-adapter.bin")
        )
        pipe.set_ip_adapter_scale(settings.STICKER_IP_ADAPTER_SCALE)
        lora_path = Path(settings.CHIBI_LORA_PATH).expanduser()
        pipe.load_lora_weights(str(lora_path.parent), weight_name=lora_path.name)
        pipe.fuse_lora(lora_scale=settings.STICKER_LORA_SCALE)
        pipe.enable_model_cpu_offload()
        pipe.enable_vae_tiling()

        self._torch = torch
        self._face_app = face_app
        self._pipe = pipe
        self.device = "cuda"

    def _load_segmenter(self) -> None:
        if self._biref is not None:
            return
        self._load()
        assert self._torch is not None
        try:
            from transformers import AutoModelForImageSegmentation
        except ImportError as exc:
            raise ProviderNotConfiguredException(provider="birefnet dependencies") from exc

        requested = settings.STICKER_SEGMENTER_DEVICE.strip().lower()
        if requested not in {"auto", "cpu", "cuda"}:
            raise GenStickerException(
                code="invalid_segmenter_device",
                message="STICKER_SEGMENTER_DEVICE must be auto, cpu, or cuda.",
                status_code=500,
            )
        if requested == "auto":
            requested = "cuda" if self._torch.cuda.is_available() else "cpu"
        if requested == "cuda" and not self._torch.cuda.is_available():
            raise ProviderNotConfiguredException(provider="cuda")

        self._biref = AutoModelForImageSegmentation.from_pretrained(
            str(Path(settings.BIREFNET_MODEL_PATH).expanduser()),
            trust_remote_code=True,
            local_files_only=True,
        ).to(requested).eval()
        self._segmenter_device = requested

    def detect_faces(self, image: Image.Image) -> list[Any]:
        self._load()
        assert self._face_app is not None
        bgr = cv2.cvtColor(np.asarray(image.convert("RGB")), cv2.COLOR_RGB2BGR)
        return list(self._face_app.get(bgr))

    def draw_keypoints(self, image: Image.Image, face: Any) -> Image.Image:
        self._load()
        assert self._draw_kps is not None
        return self._draw_kps(image, face.kps)

    def generate(
        self,
        *,
        prompt: str,
        negative_prompt: str,
        face_embedding: Any,
        keypoints: Image.Image,
        hair_canny: Image.Image,
        seed: int,
        size: int,
    ) -> Image.Image:
        self._load()
        assert self._pipe is not None
        assert self._torch is not None
        self._pipe.set_ip_adapter_scale(settings.STICKER_IP_ADAPTER_SCALE)
        return self._pipe(
            prompt=prompt,
            negative_prompt=negative_prompt,
            image_embeds=face_embedding,
            image=[keypoints, hair_canny],
            width=size,
            height=size,
            num_inference_steps=settings.STICKER_INFERENCE_STEPS,
            guidance_scale=settings.STICKER_GUIDANCE_SCALE,
            controlnet_conditioning_scale=[
                settings.STICKER_IDENTITY_CONTROL_SCALE,
                settings.STICKER_HAIR_CONTROL_SCALE,
            ],
            control_guidance_start=[0.0, 0.0],
            control_guidance_end=[1.0, settings.STICKER_HAIR_CONTROL_END],
            generator=self._torch.Generator(device="cpu").manual_seed(seed),
        ).images[0].convert("RGB")

    def segment(self, image: Image.Image) -> Image.Image:
        self._load_segmenter()
        assert self._torch is not None
        assert self._biref is not None
        assert self._segmenter_device is not None

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
            .to(self._segmenter_device)
        )
        with self._torch.inference_mode():
            prediction = (
                self._biref(tensor)[-1]
                .sigmoid()
                .float()
                .cpu()[0]
                .squeeze()
                .numpy()
            )
        mask = Image.fromarray(
            np.asarray(np.clip(prediction, 0.0, 1.0) * 255, dtype=np.uint8)
        )
        return mask.resize(image.size, Image.Resampling.LANCZOS)

    def clear_cuda_cache(self) -> None:
        if self._torch is not None and self._torch.cuda.is_available():
            self._torch.cuda.empty_cache()


class InstantIDStickerProvider(GenerationProvider):
    """One source image -> one identity-preserving chibi RGBA sticker."""

    def __init__(
        self,
        *,
        runtime: InstantIDRuntime | None = None,
        asset_store: AssetStore | None = None,
    ) -> None:
        self._runtime = runtime
        self.asset_store = asset_store or default_asset_store
        self._lock = threading.Lock()

    def _get_runtime(self) -> InstantIDRuntime:
        if self._runtime is None:
            self._runtime = LocalInstantIDRuntime()
        return self._runtime

    @staticmethod
    def _prompt_for(spec: GenerationSpec) -> str:
        emotion = spec.emotion.strip().lower()
        if emotion and emotion != "happy":
            return f"{DEFAULT_PROMPT}, {emotion} expression"
        return DEFAULT_PROMPT

    def _generate_png(
        self,
        source_path: Path,
        *,
        seed: int,
        prompt: str,
    ) -> tuple[bytes, dict[str, Any]]:
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

            runtime = self._get_runtime()
            try:
                source_faces = runtime.detect_faces(image)
                source_face = _require_one_face(source_faces, context="source image")
                reference = crop_face_context(
                    image,
                    source_face,
                    scale=settings.STICKER_REFERENCE_CROP_SCALE,
                    output_size=settings.STICKER_OUTPUT_SIZE,
                )
                reference_faces = runtime.detect_faces(reference)
                reference_face = _require_one_face(
                    reference_faces,
                    context="normalized reference",
                )
                keypoints = runtime.draw_keypoints(reference, reference_face)
                hair_canny = build_hair_canny(reference, reference_face)

                raw = runtime.generate(
                    prompt=prompt,
                    negative_prompt=DEFAULT_NEGATIVE_PROMPT,
                    face_embedding=reference_face.embedding,
                    keypoints=keypoints,
                    hair_canny=hair_canny,
                    seed=seed,
                    size=settings.STICKER_OUTPUT_SIZE,
                )
                generated_faces = runtime.detect_faces(raw)
                generated_face = _require_one_face(
                    generated_faces,
                    context="generated image",
                )
                mask = runtime.segment(raw)
                sticker, tone_gain = compose_sticker(raw, mask, generated_face)

                output = BytesIO()
                sticker.save(output, format="PNG", optimize=True)
                identity_score = _identity_similarity(reference_face, generated_face)
                return output.getvalue(), {
                    "faces_detected": len(source_faces),
                    "generated_face_count": len(generated_faces),
                    "identity_score": round(identity_score, 4),
                    "adaptive_tone_gain": round(tone_gain, 4),
                    "seed": seed,
                }
            finally:
                runtime.clear_cuda_cache()
                gc.collect()

    async def generate(
        self,
        spec: GenerationSpec,
        progress_callback: Optional[ProgressCallback] = None,
    ) -> GenerationResult:
        if settings.STICKER_PROVIDER.strip().lower() != "instantid":
            raise ProviderNotConfiguredException(provider=settings.STICKER_PROVIDER)
        if not spec.source_uri:
            return GenerationResult(
                success=False,
                provider="instantid",
                workflow_version=spec.workflow_version,
                artifacts=[],
                error_code="invalid_job_request",
                error_message="InstantID generation requires one source image.",
            )
        source_path = Path(spec.source_uri)
        if not source_path.is_file():
            return GenerationResult(
                success=False,
                provider="instantid",
                workflow_version=spec.workflow_version,
                artifacts=[],
                error_code="source_asset_unavailable",
                error_message="The private source image is unavailable to the worker.",
            )

        if progress_callback:
            progress_callback(GenerationStage.PREPARING, 15)
            progress_callback(GenerationStage.GENERATING, 35)
        started_at = time.perf_counter()
        prompt = self._prompt_for(spec)
        png_bytes, generation_metrics = await asyncio.to_thread(
            self._generate_png,
            source_path,
            seed=spec.seed,
            prompt=prompt,
        )
        inference_seconds = time.perf_counter() - started_at
        if progress_callback:
            progress_callback(GenerationStage.BACKGROUND_REMOVAL, 82)
            progress_callback(GenerationStage.POSTPROCESSING, 92)

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
            variant_name="instantid_chibi_v3",
        )
        if progress_callback:
            progress_callback(GenerationStage.COMPLETED, 100)
        runtime = self._get_runtime()
        return GenerationResult(
            success=True,
            provider="instantid",
            workflow_version=spec.workflow_version,
            artifacts=[artifact],
            metrics={
                **generation_metrics,
                "gpu_seconds": inference_seconds if runtime.device == "cuda" else 0.0,
                "inference_seconds": round(inference_seconds, 4),
                "device": runtime.device,
                "candidate_count": 1,
                "pipeline_version": "instantid-sdxl-chibi-v3",
            },
        )
