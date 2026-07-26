from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

from .export_spec import EXPORT_SPEC

GITHUB_RELEASE_PART_LIMIT = 2 * 1024 * 1024 * 1024
MODEL_ID = "lcm-sd15-chibi"
MODEL_VERSION = "1.0.1"
RELEASE_TAG = "model-lcm-sd15-v1.0.1"
RELEASE_BASE_URL = (
    f"https://github.com/dtkienIT/GenSticker/releases/download/{RELEASE_TAG}"
)


def sha256_file(path: Path, chunk_size: int = 1024 * 1024) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while chunk := handle.read(chunk_size):
            digest.update(chunk)
    return digest.hexdigest()


def build_model_manifest() -> dict[str, Any]:
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
        "scheduler": {
            "type": "lcm",
            "steps": EXPORT_SPEC.steps,
            "guidanceScale": EXPORT_SPEC.guidance_scale,
        },
        "output": {
            "width": EXPORT_SPEC.width,
            "height": EXPORT_SPEC.height,
            "stylePresetId": EXPORT_SPEC.style_preset_id,
        },
        "runtime": {"name": "onnxruntime-android", "version": "1.27.0"},
        "licenses": [
            EXPORT_SPEC.base_model.license_id,
            EXPORT_SPEC.lcm_lora.license_id,
        ],
    }


def build_distribution_manifest(directory: Path) -> dict[str, Any]:
    parts: list[dict[str, Any]] = []
    for path in sorted(item for item in directory.rglob("*") if item.is_file()):
        if path.name.endswith("manifest.json"):
            continue
        relative_path = path.relative_to(directory).as_posix()
        release_name = relative_path.replace("/", "--")
        byte_size = path.stat().st_size
        if byte_size >= GITHUB_RELEASE_PART_LIMIT:
            raise ValueError(f"{path.name} must be smaller than the GitHub 2 GiB limit")
        parts.append(
            {
                "name": release_name,
                "path": relative_path,
                "bytes": byte_size,
                "sha256": sha256_file(path),
                "url": f"{RELEASE_BASE_URL}/{release_name}",
            }
        )
    canonical = json.dumps(parts, separators=(",", ":"), sort_keys=True).encode("utf-8")
    return {
        "manifestVersion": "1.0",
        "modelId": MODEL_ID,
        "modelVersion": MODEL_VERSION,
        "artifactSha256": hashlib.sha256(canonical).hexdigest(),
        "artifactBytes": sum(int(part["bytes"]) for part in parts),
        "minimumStorageBytes": sum(int(part["bytes"]) for part in parts) * 2,
        "minimumMemoryMb": 6144,
        "runtime": "onnxruntime-android",
        "runtimeVersion": "1.27.0",
        "quantization": "fp16",
        "supportedDelegates": ["NNAPI", "CPU"],
        "inputWidth": EXPORT_SPEC.width,
        "inputHeight": EXPORT_SPEC.height,
        "licenseId": "creativeml-openrail-m+openrail++",
        "tokenizerAssets": [
            part["path"] for part in parts if str(part["path"]).startswith("tokenizer/")
        ],
        "schedulerAssets": [
            part["path"] for part in parts if str(part["path"]).startswith("scheduler/")
        ],
        "parts": parts,
    }


def write_model_manifest(directory: Path) -> Path:
    output = directory / "model.manifest.json"
    output.write_text(
        json.dumps(build_model_manifest(), indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    return output


def write_distribution_manifest(directory: Path) -> Path:
    output = directory / "model-distribution.manifest.json"
    output.write_text(
        json.dumps(build_distribution_manifest(directory), indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    return output
