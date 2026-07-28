from __future__ import annotations

import argparse
import json
import platform
import shutil
import subprocess
import zipfile
from pathlib import Path

from .coreml_export_spec import COREML_EXPORT_SPEC
from .coreml_manifest import (
    ARCHIVE_NAME,
    build_coreml_distribution_manifest,
    build_coreml_model_manifest,
)

REQUIRED_RESOURCES = (
    Path("TextEncoder.mlmodelc"),
    Path("UnetChunk1.mlmodelc"),
    Path("UnetChunk2.mlmodelc"),
    Path("VAEDecoder.mlmodelc"),
    Path("tokenizer/tokenizer.json"),
    Path("scheduler/scheduler_config.json"),
    Path("runtime-config.json"),
)
FIXED_ZIP_TIMESTAMP = (2026, 1, 1, 0, 0, 0)


def build_conversion_arguments(fused_model: Path, output: Path) -> list[str]:
    return [
        "python",
        "-m",
        "python_coreml_stable_diffusion.torch2coreml",
        "--model-version",
        str(fused_model),
        "--convert-text-encoder",
        "--convert-unet",
        "--convert-vae-decoder",
        "--chunk-unet",
        "--quantize-nbits",
        str(COREML_EXPORT_SPEC.quantization_bits),
        "--attention-implementation",
        COREML_EXPORT_SPEC.attention_implementation,
        "--compute-unit",
        COREML_EXPORT_SPEC.compute_units,
        "--bundle-resources-for-swift-cli",
        "--check-output-correctness",
        "-o",
        str(output),
    ]


def materialize_fused_pipeline(output: Path) -> None:
    import torch
    from diffusers import LCMScheduler, StableDiffusionPipeline

    pipeline = StableDiffusionPipeline.from_pretrained(
        COREML_EXPORT_SPEC.base_model_id,
        revision=COREML_EXPORT_SPEC.base_model_revision,
        torch_dtype=torch.float16,
        safety_checker=None,
        requires_safety_checker=False,
    )
    pipeline.load_lora_weights(
        COREML_EXPORT_SPEC.lcm_lora_id,
        revision=COREML_EXPORT_SPEC.lcm_lora_revision,
    )
    pipeline.fuse_lora()
    pipeline.scheduler = LCMScheduler.from_config(pipeline.scheduler.config)
    output.mkdir(parents=True, exist_ok=True)
    pipeline.save_pretrained(output, safe_serialization=True)


def build_runtime_tokenizer(tokenizer_dir: Path) -> dict[str, object]:
    tokenizer_json = tokenizer_dir / "tokenizer.json"
    if tokenizer_json.is_file():
        tokenizer = json.loads(tokenizer_json.read_text(encoding="utf-8"))
        model = tokenizer["model"]
        raw_merges = model["merges"]
        model["merges"] = [
            merge.split(" ", maxsplit=1) if isinstance(merge, str) else merge
            for merge in raw_merges
        ]
        return tokenizer

    vocab_path = tokenizer_dir / "vocab.json"
    merges_path = tokenizer_dir / "merges.txt"
    if not vocab_path.is_file() or not merges_path.is_file():
        raise ValueError("Fused model is missing CLIP tokenizer resources")
    merges = [
        line.split(" ", maxsplit=1)
        for line in merges_path.read_text(encoding="utf-8").splitlines()
        if line and not line.startswith("#")
    ]
    if any(len(merge) != 2 for merge in merges):
        raise ValueError("CLIP tokenizer contains an invalid BPE merge")
    return {
        "model": {
            "vocab": json.loads(vocab_path.read_text(encoding="utf-8")),
            "merges": merges,
        }
    }


def prepare_runtime_resources(fused_model: Path, converted_output: Path) -> Path:
    resources = converted_output / "Resources"
    if not resources.is_dir():
        raise ValueError(f"Core ML converter did not create {resources}")

    scheduler_source = fused_model / "scheduler" / "scheduler_config.json"
    tokenizer_destination = resources / "tokenizer" / "tokenizer.json"
    tokenizer_destination.parent.mkdir(parents=True, exist_ok=True)
    tokenizer_destination.write_text(
        json.dumps(
            build_runtime_tokenizer(fused_model / "tokenizer"),
            separators=(",", ":"),
            sort_keys=True,
        ),
        encoding="utf-8",
    )
    if not scheduler_source.is_file():
        raise ValueError(f"Fused model is missing {scheduler_source}")
    scheduler_destination = resources / "scheduler" / "scheduler_config.json"
    scheduler_destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(scheduler_source, scheduler_destination)

    (resources / "runtime-config.json").write_text(
        json.dumps(
            {
                "contractVersion": "1.0",
                "steps": COREML_EXPORT_SPEC.inference_steps,
                "guidanceScale": COREML_EXPORT_SPEC.guidance_scale,
                "width": COREML_EXPORT_SPEC.width,
                "height": COREML_EXPORT_SPEC.height,
                "computeUnits": COREML_EXPORT_SPEC.compute_units,
                "negativePrompt": (
                    "photorealistic, text, watermark, gore, explicit content"
                ),
                "promptSuffix": (
                    "chibi sticker, bold clean outline, centered subject"
                ),
            },
            indent=2,
            sort_keys=True,
        )
        + "\n",
        encoding="utf-8",
    )
    return resources


def package_coreml_bundle(resources: Path, output: Path) -> Path:
    missing = [str(path) for path in REQUIRED_RESOURCES if not (resources / path).exists()]
    if missing:
        raise ValueError(f"Core ML resources are incomplete; missing {', '.join(missing)}")

    output.mkdir(parents=True, exist_ok=True)
    staging = output / "bundle"
    if staging.exists():
        shutil.rmtree(staging)
    shutil.copytree(resources, staging)
    (staging / "model.manifest.json").write_text(
        json.dumps(build_coreml_model_manifest(), indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )

    archive_path = output / ARCHIVE_NAME
    with zipfile.ZipFile(
        archive_path,
        mode="w",
        compression=zipfile.ZIP_DEFLATED,
        allowZip64=True,
    ) as archive:
        for path in sorted(item for item in staging.rglob("*") if item.is_file()):
            relative = path.relative_to(staging).as_posix()
            info = zipfile.ZipInfo(relative, FIXED_ZIP_TIMESTAMP)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, path.read_bytes())

    (output / "model.manifest.json").write_text(
        json.dumps(build_coreml_model_manifest(), indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    distribution = build_coreml_distribution_manifest(archive_path, staging)
    manifest_path = output / "model-distribution.manifest.json"
    manifest_path.write_text(
        json.dumps(distribution, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    return manifest_path


def export_pipeline(work_dir: Path, output: Path) -> Path:
    if platform.system() != "Darwin":
        raise RuntimeError("Core ML export requires macOS")
    fused_model = work_dir / "fused"
    converted_output = work_dir / "converted"
    materialize_fused_pipeline(fused_model)
    subprocess.run(
        build_conversion_arguments(fused_model, converted_output),
        check=True,
    )
    resources = prepare_runtime_resources(fused_model, converted_output)
    return package_coreml_bundle(resources, output)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Export the pinned GenSticker LCM pipeline to Core ML",
    )
    parser.add_argument("--work-dir", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    manifest = export_pipeline(args.work_dir.resolve(), args.output.resolve())
    print(manifest)


if __name__ == "__main__":
    main()
