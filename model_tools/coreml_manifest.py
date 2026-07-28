from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Any

from .coreml_export_spec import COREML_EXPORT_SPEC
from .export_spec import EXPORT_SPEC

GITHUB_RELEASE_ASSET_LIMIT = 2 * 1024 * 1024 * 1024
MODEL_ID = "lcm-sd15-chibi"
MODEL_VERSION = "1.0.1-coreml.1"
RELEASE_TAG = "model-lcm-sd15-coreml-v1.0.1"
ARCHIVE_NAME = "lcm-sd15-chibi-coreml-ios-v1.0.1.zip"
RELEASE_BASE_URL = (
    f"https://github.com/dtkienIT/GenSticker/releases/download/{RELEASE_TAG}"
)
STORAGE_HEADROOM_BYTES = 256 * 1024 * 1024


def sha256_file(path: Path, chunk_size: int = 1024 * 1024) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while chunk := handle.read(chunk_size):
            digest.update(chunk)
    return digest.hexdigest()


def build_coreml_model_manifest() -> dict[str, Any]:
    return {
        "manifestVersion": "1.0",
        "modelId": MODEL_ID,
        "modelVersion": MODEL_VERSION,
        "baseModel": {
            "id": EXPORT_SPEC.base_model.model_id,
            "revision": EXPORT_SPEC.base_model.revision,
        },
        "lcmLora": {
            "id": EXPORT_SPEC.lcm_lora.model_id,
            "revision": EXPORT_SPEC.lcm_lora.revision,
        },
        "runtime": {
            "name": "coreml-ios",
            "minimumIos": COREML_EXPORT_SPEC.minimum_ios,
        },
        "compression": {
            "weightBits": COREML_EXPORT_SPEC.quantization_bits,
            "chunkUnet": COREML_EXPORT_SPEC.chunk_unet,
            "attentionImplementation": COREML_EXPORT_SPEC.attention_implementation,
        },
        "scheduler": {
            "type": "lcm",
            "steps": COREML_EXPORT_SPEC.inference_steps,
            "guidanceScale": COREML_EXPORT_SPEC.guidance_scale,
        },
        "output": {
            "width": COREML_EXPORT_SPEC.width,
            "height": COREML_EXPORT_SPEC.height,
            "stylePresetId": EXPORT_SPEC.style_preset_id,
        },
        "licenses": [
            EXPORT_SPEC.base_model.license_id,
            EXPORT_SPEC.lcm_lora.license_id,
        ],
    }


def build_coreml_distribution_manifest(
    archive_path: Path,
    unpacked_root: Path,
) -> dict[str, Any]:
    archive_bytes = archive_path.stat().st_size
    if archive_bytes >= GITHUB_RELEASE_ASSET_LIMIT:
        raise ValueError(f"{archive_path.name} must be smaller than the GitHub 2 GiB limit")

    parts = [
        {
            "path": path.relative_to(unpacked_root).as_posix(),
            "bytes": path.stat().st_size,
            "sha256": sha256_file(path),
        }
        for path in sorted(item for item in unpacked_root.rglob("*") if item.is_file())
    ]
    uncompressed_bytes = sum(int(part["bytes"]) for part in parts)
    return {
        "manifestVersion": "1.0",
        "modelId": MODEL_ID,
        "modelVersion": MODEL_VERSION,
        "runtime": "coreml-ios",
        "runtimeVersion": "ios-17",
        "quantization": "palettized-4bit",
        "supportedDelegates": ["ANE", "GPU", "CPU"],
        "selectedDelegate": "ANE",
        "minimumMemoryMb": 4096,
        "inputWidth": COREML_EXPORT_SPEC.width,
        "inputHeight": COREML_EXPORT_SPEC.height,
        "licenseId": "creativeml-openrail-m+openrail++",
        "artifactBytes": archive_bytes,
        "artifactSha256": sha256_file(archive_path),
        "uncompressedBytes": uncompressed_bytes,
        "minimumStorageBytes": (
            archive_bytes + 2 * uncompressed_bytes + STORAGE_HEADROOM_BYTES
        ),
        "url": f"{RELEASE_BASE_URL}/{ARCHIVE_NAME}",
        "parts": parts,
    }
