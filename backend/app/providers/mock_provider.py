import asyncio
import random
import uuid
from io import BytesIO
from typing import Callable, Optional

from backend.app.core.config import settings
from backend.app.providers.base import (
    GenerationArtifact,
    GenerationProvider,
    GenerationResult,
    GenerationSpec,
)
from backend.app.storage.asset_store import AssetStore, default_asset_store
from PIL import Image as PILImage
from PIL import ImageDraw


class MockGenerationProvider(GenerationProvider):
    def __init__(
        self,
        asset_store: Optional[AssetStore] = None,
        delay_ms: Optional[int] = None,
        simulate_failure: bool = False,
    ):
        self.asset_store = asset_store or default_asset_store
        self.delay_ms = delay_ms if delay_ms is not None else settings.MOCK_GENERATION_DELAY_MS
        self.simulate_failure = simulate_failure

    async def generate(
        self,
        spec: GenerationSpec,
        progress_callback: Optional[Callable[[str, int], None]] = None,
    ) -> GenerationResult:
        stages = [
            ("validating", 10),
            ("preparing", 30),
            ("generating", 60),
            ("background_removal", 85),
            ("completed", 100),
        ]

        step_delay = (self.delay_ms / 1000.0) / len(stages) if self.delay_ms > 0 else 0.01

        for stage_name, progress_pct in stages:
            if progress_callback:
                progress_callback(stage_name, progress_pct)
            if step_delay > 0:
                await asyncio.sleep(step_delay)

        if self.simulate_failure:
            return GenerationResult(
                success=False,
                provider="mock",
                workflow_version=spec.workflow_version,
                artifacts=[],
                error_code="simulated_mock_failure",
                error_message="Simulated mock generation failure for testing.",
            )

        artifacts: list[GenerationArtifact] = []

        # Generate 3 deterministic candidate mock images
        colors = [
            ("#6366F1", "#EEF2FF"),  # Indigo
            ("#EC4899", "#FCE7F3"),  # Pink
            ("#10B981", "#D1FAE5"),  # Emerald
        ]

        for idx in range(1, 4):
            bg_color, fg_color = colors[(idx - 1) % len(colors)]
            img_bytes = self._create_mock_image(
                seed=spec.seed + idx,
                style=spec.style,
                emotion=spec.emotion,
                candidate_num=idx,
                bg_color=bg_color,
                fg_color=fg_color,
            )

            stored = self.asset_store.save_bytes(
                data=img_bytes,
                user_id=spec.user_id,
                extension=".png",
                asset_subfolder="canonical_candidates",
            )

            artifacts.append(
                GenerationArtifact(
                    asset_id=str(uuid.uuid4()),
                    relative_path=stored.relative_path,
                    mime_type=stored.mime_type,
                    byte_size=stored.byte_size,
                    sha256=stored.sha256,
                    width=stored.width or 512,
                    height=stored.height or 512,
                    variant_name=f"candidate_{idx}",
                )
            )

        return GenerationResult(
            success=True,
            provider="mock",
            workflow_version=spec.workflow_version,
            artifacts=artifacts,
            metrics={
                "gpu_seconds": max(0.1, round(self.delay_ms / 1000.0, 2)),
                "candidate_count": len(artifacts),
            },
        )

    def _create_mock_image(
        self,
        seed: int,
        style: str,
        emotion: str,
        candidate_num: int,
        bg_color: str,
        fg_color: str,
    ) -> bytes:
        rng = random.Random(seed)
        img = PILImage.new("RGBA", (512, 512), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)

        # Draw rounded card background
        draw.rounded_rectangle([20, 20, 492, 492], radius=40, fill=bg_color)

        # Draw character face
        center_x, center_y = 256, 230
        face_radius = 120 + rng.randint(-10, 10)
        draw.ellipse(
            [
                center_x - face_radius,
                center_y - face_radius,
                center_x + face_radius,
                center_y + face_radius,
            ],
            fill=fg_color,
            outline="#1E293B",
            width=6,
        )

        # Eyes
        draw.ellipse([210 - 15, 200 - 15, 210 + 15, 200 + 15], fill="#1E293B")
        draw.ellipse([302 - 15, 200 - 15, 302 + 15, 200 + 15], fill="#1E293B")

        # Smile based on emotion
        if emotion == "happy":
            draw.arc([206 - 30, 230, 306 + 30, 270], start=0, end=180, fill="#1E293B", width=6)
        elif emotion == "angry":
            draw.line([190, 180, 230, 195], fill="#1E293B", width=6)
            draw.line([322, 180, 282, 195], fill="#1E293B", width=6)
            draw.arc([216, 250, 296, 270], start=180, end=360, fill="#1E293B", width=6)
        else:
            draw.line([216, 250, 296, 250], fill="#1E293B", width=6)

        # Draw text label
        label = f"{style.upper()} #{candidate_num} ({emotion})"
        draw.rectangle([60, 410, 452, 460], fill="#FFFFFF")
        draw.text((80, 422), label, fill="#0F172A")

        buf = BytesIO()
        img.save(buf, format="PNG")
        return buf.getvalue()
