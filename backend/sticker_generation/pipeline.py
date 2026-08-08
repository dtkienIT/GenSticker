from __future__ import annotations

import asyncio
import hashlib
import json
import tempfile
from pathlib import Path
from typing import Sequence, cast

from sticker_generation.catalog import DEFAULT_STICKER_CATALOG
from sticker_generation.models import (
    ImageGenerationRequest,
    StickerPackItem,
    StickerPackResult,
    StickerTemplate,
)
from sticker_generation.identity import sanitize_reference_image
from sticker_generation.postprocess import build_contact_sheet, postprocess_sticker, sha256_bytes
from sticker_generation.prompts import build_canonical_prompt, build_sticker_prompt
from sticker_generation.providers.base import ImageProvider


def technical_quality_gate(image_bytes: bytes, *, canvas_size: int) -> tuple[bool, str]:
    """Cheap hard gate; identity/pose scoring can be injected by the caller."""
    from io import BytesIO
    from PIL import Image

    image = Image.open(BytesIO(image_bytes)).convert("RGBA")
    if image.size != (canvas_size, canvas_size):
        return False, "wrong_canvas_size"
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if bbox is None:
        return False, "blank_output"
    alpha_values = cast(Sequence[int], alpha.get_flattened_data())
    coverage = sum(1 for value in alpha_values if value > 0) / (
        canvas_size * canvas_size
    )
    if coverage >= 0.98:
        return False, "opaque_background"
    return True, "pass"


class StickerPackGenerator:
    def __init__(
        self,
        *,
        provider: ImageProvider,
        max_quality_retries: int = 1,
        concurrency: int = 3,
        canvas_size: int = 640,
        quality_gate=None,
        include_source_hashes: bool = False,
    ) -> None:
        if max_quality_retries < 0:
            raise ValueError("max_quality_retries_must_be_non_negative")
        if concurrency < 1:
            raise ValueError("concurrency_must_be_positive")
        self.provider = provider
        self.max_quality_retries = max_quality_retries
        self.concurrency = concurrency
        self.canvas_size = canvas_size
        self.quality_gate = quality_gate or (lambda data, _template: technical_quality_gate(data, canvas_size=canvas_size))
        self.include_source_hashes = include_source_hashes

    async def generate_canonical_candidates(
        self,
        *,
        selfie_path: Path,
        output_dir: Path,
        candidate_count: int = 3,
        style_prompt: str = "clean hand-drawn Korean and Japanese cartoon sticker",
    ) -> tuple[Path, ...]:
        selfie_path = self._require_image(selfie_path, "selfie_missing")
        if not 1 <= candidate_count <= 4:
            raise ValueError("canonical_candidate_count_out_of_range")
        output_dir.mkdir(parents=True, exist_ok=True)
        prompt = build_canonical_prompt(style_prompt)
        paths: list[Path] = []
        records: list[dict[str, object]] = []
        with tempfile.TemporaryDirectory(prefix="sticker-canonical-") as temporary_dir:
            sanitized_selfie = sanitize_reference_image(
                selfie_path, Path(temporary_dir) / "selfie.png"
            )
            for index in range(1, candidate_count + 1):
                result = await self.provider.generate(
                    ImageGenerationRequest(
                        prompt=prompt,
                        reference_images=(sanitized_selfie,),
                        metadata={"stage": "canonical", "candidate_index": index},
                    )
                )
                processed = postprocess_sticker(result.image_bytes, canvas_size=self.canvas_size)
                path = output_dir / f"canonical_{index}.png"
                self._atomic_write(path, processed)
                paths.append(path)
                records.append(
                    {
                        "candidate_index": index,
                        "path": str(path.resolve()),
                        "sha256": sha256_bytes(processed),
                        "provider": result.provider,
                        "model": result.model,
                        "request_id": result.request_id,
                        "latency_seconds": result.latency_seconds,
                        "estimated_cost_usd": result.estimated_cost_usd,
                    }
                )
        manifest: dict[str, object] = {
            "schema_version": "canonical-candidates-v1",
            "style_prompt": style_prompt,
            "candidates": records,
        }
        if self.include_source_hashes:
            manifest["selfie_sha256"] = self._sha256_file(selfie_path)
        self._write_json(output_dir / "canonical_manifest.json", manifest)
        return tuple(paths)

    async def generate_pack(
        self,
        *,
        selfie_path: Path,
        canonical_path: Path,
        pose_reference_dir: Path,
        output_dir: Path,
        templates: Sequence[StickerTemplate] = DEFAULT_STICKER_CATALOG,
    ) -> StickerPackResult:
        selfie_path = self._require_image(selfie_path, "selfie_missing")
        canonical_path = self._require_image(canonical_path, "canonical_missing")
        template_tuple = tuple(templates)
        if not template_tuple:
            raise ValueError("pack_requires_templates")
        if len({item.template_id for item in template_tuple}) != len(template_tuple):
            raise ValueError("duplicate_template_id")
        references: dict[str, Path] = {}
        for template in template_tuple:
            reference = pose_reference_dir / template.reference_filename
            if not reference.is_file():
                raise FileNotFoundError(f"pose_reference_missing:{reference}")
            references[template.template_id] = reference

        sticker_dir = output_dir / "stickers"
        sticker_dir.mkdir(parents=True, exist_ok=True)
        semaphore = asyncio.Semaphore(self.concurrency)
        with tempfile.TemporaryDirectory(prefix="sticker-pack-") as temporary_dir:
            temp_root = Path(temporary_dir)
            sanitized_selfie = sanitize_reference_image(selfie_path, temp_root / "selfie.png")
            sanitized_canonical = sanitize_reference_image(
                canonical_path, temp_root / "canonical.png", preserve_alpha=True
            )

            async def generate_one(template: StickerTemplate) -> StickerPackItem:
                async with semaphore:
                    return await self._generate_pack_item(
                        template=template,
                        selfie_path=sanitized_selfie,
                        canonical_path=sanitized_canonical,
                        pose_reference_path=references[template.template_id],
                        sticker_dir=sticker_dir,
                    )

            tasks = [asyncio.create_task(generate_one(item)) for item in template_tuple]
            try:
                items = tuple(await asyncio.gather(*tasks))
            except BaseException:
                for task in tasks:
                    task.cancel()
                await asyncio.gather(*tasks, return_exceptions=True)
                raise
        contact_sheet = build_contact_sheet(
            (Path(item.output_path) for item in items),
            output_dir / "contact_sheet.png",
            cell_size=self.canvas_size,
        )
        manifest_path = output_dir / "manifest.json"
        manifest = {
            "schema_version": "api-sticker-pack-v1",
            "template_ids": [item.template_id for item in template_tuple],
            "total_estimated_cost_usd": round(sum(item.estimated_cost_usd for item in items), 6),
            "items": [item.model_dump(mode="json") for item in items],
            "contact_sheet_path": str(contact_sheet.resolve()),
        }
        if self.include_source_hashes:
            manifest["selfie_sha256"] = self._sha256_file(selfie_path)
            manifest["canonical_sha256"] = self._sha256_file(canonical_path)
        self._write_json(manifest_path, manifest)
        return StickerPackResult(
            output_dir=str(output_dir.resolve()),
            items=items,
            manifest_path=str(manifest_path.resolve()),
            contact_sheet_path=str(contact_sheet.resolve()),
        )

    async def _generate_pack_item(
        self,
        *,
        template: StickerTemplate,
        selfie_path: Path,
        canonical_path: Path,
        pose_reference_path: Path,
        sticker_dir: Path,
    ) -> StickerPackItem:
        attempts = 0
        last_error: Exception | None = None
        attempt_errors: list[str] = []
        total_cost = 0.0
        total_latency = 0.0
        while attempts <= self.max_quality_retries:
            attempts += 1
            try:
                result = await self.provider.generate(
                    ImageGenerationRequest(
                        prompt=build_sticker_prompt(template),
                        negative_prompt=template.negative_prompt,
                        reference_images=(selfie_path, canonical_path, pose_reference_path),
                        metadata={
                            "stage": "sticker",
                            "template_id": template.template_id,
                            "attempt": attempts,
                        },
                    )
                )
                total_cost += result.estimated_cost_usd
                total_latency += result.latency_seconds
                processed = postprocess_sticker(result.image_bytes, canvas_size=self.canvas_size)
                accepted, reason = self.quality_gate(processed, template)
                if not accepted:
                    raise ValueError(f"quality_gate_rejected:{reason}")
                output_path = sticker_dir / template.reference_filename
                self._atomic_write(output_path, processed)
                return StickerPackItem(
                    template_id=template.template_id,
                    label=template.label,
                    output_path=str(output_path.resolve()),
                    sha256=sha256_bytes(processed),
                    provider=result.provider,
                    model=result.model,
                    request_id=result.request_id,
                    attempts=attempts,
                    latency_seconds=total_latency,
                    estimated_cost_usd=total_cost,
                    attempt_errors=tuple(attempt_errors),
                )
            except Exception as error:
                last_error = error
                attempt_errors.append(str(error))
        raise RuntimeError(
            f"sticker_generation_failed:{template.template_id}:{last_error}"
        ) from last_error

    @staticmethod
    def _require_image(path: Path, code: str) -> Path:
        path = Path(path)
        if not path.is_file():
            raise FileNotFoundError(f"{code}:{path}")
        return path

    @staticmethod
    def _sha256_file(path: Path) -> str:
        return hashlib.sha256(path.read_bytes()).hexdigest()

    @staticmethod
    def _atomic_write(path: Path, data: bytes) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary = path.with_suffix(path.suffix + ".tmp")
        temporary.write_bytes(data)
        temporary.replace(path)

    @staticmethod
    def _write_json(path: Path, payload: dict[str, object]) -> None:
        encoded = json.dumps(payload, indent=2, ensure_ascii=False).encode("utf-8")
        StickerPackGenerator._atomic_write(path, encoded)
