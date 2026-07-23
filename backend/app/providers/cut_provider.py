import asyncio
import threading
import time
import uuid
from io import BytesIO
from pathlib import Path
from typing import Any, Optional, Protocol

from PIL import Image as PILImage

from backend.app.core.config import settings
from backend.app.core.errors import ProviderNotConfiguredException
from backend.app.providers.base import (
    GenerationArtifact,
    GenerationProvider,
    GenerationResult,
    GenerationSpec,
    GenerationStage,
    ProgressCallback,
)
from backend.app.storage.asset_store import AssetStore, default_asset_store


class CutRuntime(Protocol):
    def generate_png(self, source_path: Path) -> tuple[bytes, dict[str, Any]]: ...


def _build_resnet_generator(torch: Any) -> Any:
    """Build the CUT ResNet-9 generator with checkpoint-compatible module names."""
    nn = torch.nn
    functional = torch.nn.functional

    def make_filter(size: int) -> Any:
        coefficients = {
            1: [1.0],
            2: [1.0, 1.0],
            3: [1.0, 2.0, 1.0],
            4: [1.0, 3.0, 3.0, 1.0],
        }[size]
        vector = torch.tensor(coefficients)
        image_filter = vector[:, None] * vector[None, :]
        return image_filter / image_filter.sum()

    class Downsample(nn.Module):  # type: ignore[name-defined,misc]
        def __init__(self, channels: int, filter_size: int = 3, stride: int = 2):
            super().__init__()
            self.stride = stride
            padding_left = (filter_size - 1) // 2
            padding_right = (filter_size - 1 + 1) // 2
            self.pad = nn.ReflectionPad2d(
                [padding_left, padding_right, padding_left, padding_right]
            )
            image_filter = make_filter(filter_size)
            self.register_buffer("filt", image_filter[None, None, :, :].repeat(channels, 1, 1, 1))

        def forward(self, value: Any) -> Any:
            return functional.conv2d(
                self.pad(value), self.filt, stride=self.stride, groups=value.shape[1]
            )

    class Upsample(nn.Module):  # type: ignore[name-defined,misc]
        def __init__(self, channels: int, filter_size: int = 4, stride: int = 2):
            super().__init__()
            self.filter_size = filter_size
            self.stride = stride
            self.pad_size = (filter_size - 1) // 2
            image_filter = make_filter(filter_size) * (stride**2)
            self.register_buffer("filt", image_filter[None, None, :, :].repeat(channels, 1, 1, 1))
            self.pad = nn.ReplicationPad2d(1)

        def forward(self, value: Any) -> Any:
            result = functional.conv_transpose2d(
                self.pad(value),
                self.filt,
                stride=self.stride,
                padding=1 + self.pad_size,
                groups=value.shape[1],
            )[:, :, 1:, 1:]
            if self.filter_size % 2 == 0:
                result = result[:, :, :-1, :-1]
            return result

    class ResnetBlock(nn.Module):  # type: ignore[name-defined,misc]
        def __init__(self, dim: int):
            super().__init__()
            self.conv_block = nn.Sequential(
                nn.ReflectionPad2d(1),
                nn.Conv2d(dim, dim, kernel_size=3, padding=0, bias=True),
                nn.InstanceNorm2d(dim),
                nn.ReLU(True),
                nn.ReflectionPad2d(1),
                nn.Conv2d(dim, dim, kernel_size=3, padding=0, bias=True),
                nn.InstanceNorm2d(dim),
            )

        def forward(self, value: Any) -> Any:
            return value + self.conv_block(value)

    class ResnetGenerator(nn.Module):  # type: ignore[name-defined,misc]
        def __init__(self):
            super().__init__()
            layers: list[Any] = [
                nn.ReflectionPad2d(3),
                nn.Conv2d(3, 64, kernel_size=7, padding=0, bias=True),
                nn.InstanceNorm2d(64),
                nn.ReLU(True),
            ]
            for level in range(2):
                multiplier = 2**level
                layers.extend(
                    [
                        nn.Conv2d(
                            64 * multiplier,
                            64 * multiplier * 2,
                            kernel_size=3,
                            stride=1,
                            padding=1,
                            bias=True,
                        ),
                        nn.InstanceNorm2d(64 * multiplier * 2),
                        nn.ReLU(True),
                        Downsample(64 * multiplier * 2),
                    ]
                )
            layers.extend(ResnetBlock(256) for _ in range(9))
            for level in range(2):
                multiplier = 2 ** (2 - level)
                layers.extend(
                    [
                        Upsample(64 * multiplier),
                        nn.Conv2d(
                            64 * multiplier,
                            64 * multiplier // 2,
                            kernel_size=3,
                            padding=1,
                            bias=True,
                        ),
                        nn.InstanceNorm2d(64 * multiplier // 2),
                        nn.ReLU(True),
                    ]
                )
            layers.extend(
                [
                    nn.ReflectionPad2d(3),
                    nn.Conv2d(64, 3, kernel_size=7, padding=0),
                    nn.Tanh(),
                ]
            )
            self.model = nn.Sequential(*layers)

        def forward(self, value: Any) -> Any:
            return self.model(value)

    return ResnetGenerator()


class TorchCutRuntime:
    """Lazy, process-local runtime for the trained CUT ResnetGenerator checkpoint."""

    def __init__(self, checkpoint_path: Path, device_name: str = "auto"):
        self.checkpoint_path = checkpoint_path
        self.device_name = device_name
        self._model: Any = None
        self._device: Any = None
        self._lock = threading.Lock()

    def _load_model(self) -> tuple[Any, Any]:
        if self._model is not None:
            return self._model, self._device

        try:
            import torch  # type: ignore[import-not-found]
        except ImportError as exc:
            raise RuntimeError("CUT runtime dependencies are not installed.") from exc

        if self.device_name == "auto":
            device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        else:
            device = torch.device(self.device_name)

        model = _build_resnet_generator(torch)
        state_dict = torch.load(self.checkpoint_path, map_location=device)
        if hasattr(state_dict, "_metadata"):
            del state_dict._metadata
        model.load_state_dict(state_dict)
        model.to(device)
        model.eval()
        self._model = model
        self._device = device
        return model, device

    @staticmethod
    def _prepare_image(source_path: Path) -> PILImage.Image:
        with PILImage.open(source_path) as source:
            image = source.convert("RGB")
        width, height = image.size
        min_dim = min(width, height)
        left = (width - min_dim) // 2
        top = max(0, int((height - min_dim) * 0.2))
        return image.crop((left, top, left + min_dim, top + min_dim)).resize(
            (256, 256), PILImage.Resampling.LANCZOS
        )

    def generate_png(self, source_path: Path) -> tuple[bytes, dict[str, Any]]:
        try:
            import numpy as np
            import torch  # type: ignore[import-not-found]
            import torchvision.transforms as transforms  # type: ignore[import-not-found]
        except ImportError as exc:
            raise RuntimeError("CUT runtime dependencies are not installed.") from exc

        with self._lock:
            model, device = self._load_model()
            input_image = self._prepare_image(source_path)
            transform = transforms.Compose(
                [
                    transforms.ToTensor(),
                    transforms.Normalize((0.5, 0.5, 0.5), (0.5, 0.5, 0.5)),
                ]
            )
            input_tensor = transform(input_image).unsqueeze(0).to(device)
            started_at = time.perf_counter()
            with torch.no_grad():
                output_tensor = model(input_tensor)
            inference_seconds = time.perf_counter() - started_at

        rgb = (output_tensor.squeeze(0).cpu().permute(1, 2, 0).numpy() * 0.5 + 0.5) * 255.0
        rgb = np.clip(rgb, 0, 255).astype(np.uint8)
        gray = np.asarray(PILImage.fromarray(rgb, mode="RGB").convert("L"))
        alpha = np.where(gray < settings.CUT_BACKGROUND_THRESHOLD, 255, 0).astype(np.uint8)
        radius = max(1, settings.CUT_OUTLINE_KERNEL_SIZE // 2)
        padded = np.pad(alpha, radius, mode="constant")
        dilated = np.zeros_like(alpha)
        for y_offset in range(-radius, radius + 1):
            for x_offset in range(-radius, radius + 1):
                if x_offset * x_offset + y_offset * y_offset > radius * radius:
                    continue
                y_start = radius + y_offset
                x_start = radius + x_offset
                dilated = np.maximum(
                    dilated,
                    padded[y_start : y_start + alpha.shape[0], x_start : x_start + alpha.shape[1]],
                )

        rgb_512 = np.asarray(
            PILImage.fromarray(rgb, mode="RGB").resize((512, 512), PILImage.Resampling.BICUBIC)
        )
        alpha_512 = np.asarray(
            PILImage.fromarray(dilated, mode="L").resize(
                (512, 512), PILImage.Resampling.BICUBIC
            )
        )
        sticker_rgba = np.dstack((rgb_512, alpha_512))
        output = BytesIO()
        PILImage.fromarray(sticker_rgba, mode="RGBA").save(output, format="PNG")
        return output.getvalue(), {
            "gpu_seconds": round(inference_seconds, 4) if device.type == "cuda" else 0.0,
            "inference_seconds": round(inference_seconds, 4),
            "device": device.type,
            "checkpoint": self.checkpoint_path.name,
        }


class CutGenerationProvider(GenerationProvider):
    def __init__(
        self,
        *,
        enabled: Optional[bool] = None,
        checkpoint_path: Optional[Path | str] = None,
        runtime: Optional[CutRuntime] = None,
        asset_store: Optional[AssetStore] = None,
    ):
        self.enabled = settings.CUT_ENABLED if enabled is None else enabled
        bundled_checkpoint = Path(__file__).resolve().parents[2] / "models" / "cut" / "8_net_G.pth"
        configured_checkpoint = checkpoint_path or settings.CUT_CHECKPOINT_PATH
        self.checkpoint_path = Path(configured_checkpoint or bundled_checkpoint).expanduser()
        self.asset_store = asset_store or default_asset_store
        self.runtime = runtime

    def _get_runtime(self) -> CutRuntime:
        if self.runtime is None:
            self.runtime = TorchCutRuntime(
                checkpoint_path=self.checkpoint_path,
                device_name=settings.CUT_DEVICE,
            )
        return self.runtime

    async def generate(
        self,
        spec: GenerationSpec,
        progress_callback: Optional[ProgressCallback] = None,
    ) -> GenerationResult:
        if not self.enabled:
            raise ProviderNotConfiguredException(provider="cut")
        if not self.checkpoint_path.is_file() and self.runtime is None:
            raise ProviderNotConfiguredException(provider="cut checkpoint")
        if not spec.source_uri:
            return GenerationResult(
                success=False,
                provider="cut",
                workflow_version=spec.workflow_version,
                artifacts=[],
                error_code="invalid_job_request",
                error_message="CUT generation requires a private source image.",
            )

        source_path = Path(spec.source_uri)
        if not source_path.is_file():
            return GenerationResult(
                success=False,
                provider="cut",
                workflow_version=spec.workflow_version,
                artifacts=[],
                error_code="source_asset_unavailable",
                error_message="The private source image is unavailable to the CUT worker.",
            )

        try:
            if progress_callback:
                progress_callback(GenerationStage.PREPARING, 20)
                progress_callback(GenerationStage.GENERATING, 45)
            png_bytes, metrics = await asyncio.to_thread(
                self._get_runtime().generate_png, source_path
            )
            if progress_callback:
                progress_callback(GenerationStage.POSTPROCESSING, 85)
            stored = self.asset_store.save_bytes(
                png_bytes,
                user_id=spec.user_id,
                extension=".png",
                asset_subfolder="cut_stickers",
            )
            artifact = GenerationArtifact(
                asset_id=str(uuid.uuid4()),
                relative_path=stored.relative_path,
                mime_type=stored.mime_type,
                byte_size=stored.byte_size,
                sha256=stored.sha256,
                width=stored.width or 512,
                height=stored.height or 512,
                variant_name="cut_epoch_8",
            )
            if progress_callback:
                progress_callback(GenerationStage.COMPLETED, 100)
            return GenerationResult(
                success=True,
                provider="cut",
                workflow_version=spec.workflow_version,
                artifacts=[artifact],
                metrics={**metrics, "candidate_count": 1},
            )
        except Exception:
            return GenerationResult(
                success=False,
                provider="cut",
                workflow_version=spec.workflow_version,
                artifacts=[],
                error_code="provider_unavailable",
                error_message="CUT inference failed. Check worker configuration and logs.",
            )
