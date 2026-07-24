"""Materialize the redistributable InstantID pipeline assets outside Git."""

import argparse
import subprocess
from pathlib import Path

from huggingface_hub import hf_hub_download, snapshot_download

INSTANTID_CODE_REVISION = "2145b67f9607da6234702063692330185f374486"
INSTANTID_MODEL_REVISION = "57b32dfee076092ad2930c71fd6d439c2c3b1820"
CANNY_REVISION = "1271357eda52d54b857c650cacb5b51144643ccb"
BIREFNET_REVISION = "e2bf8e4460fc8fa32bba5ea4d94b3233d367b0e4"
SDXL_REVISION = "462165984030d82259a11f4367a4eed129e94a7b"


def _run(*args: str) -> str:
    completed = subprocess.run(
        args,
        check=True,
        capture_output=True,
        text=True,
    )
    return completed.stdout.strip()


def _prepare_code(target: Path) -> None:
    required = target / "pipeline_stable_diffusion_xl_instantid_full.py"
    if target.exists():
        if not required.is_file() or not (target / ".git").is_dir():
            raise RuntimeError(
                f"{target} exists but is not a complete InstantID Git checkout."
            )
        current = _run("git", "-C", str(target), "rev-parse", "HEAD")
        if current != INSTANTID_CODE_REVISION:
            raise RuntimeError(
                "InstantID code revision does not match the tested revision: "
                f"{current} != {INSTANTID_CODE_REVISION}"
            )
        return

    target.parent.mkdir(parents=True, exist_ok=True)
    _run(
        "git",
        "clone",
        "--no-checkout",
        "https://github.com/instantX-research/InstantID.git",
        str(target),
    )
    _run("git", "-C", str(target), "checkout", INSTANTID_CODE_REVISION)


def _prepare_instantid_weights(target: Path) -> None:
    for filename in (
        "ControlNetModel/config.json",
        "ControlNetModel/diffusion_pytorch_model.safetensors",
        "ip-adapter.bin",
    ):
        hf_hub_download(
            repo_id="InstantX/InstantID",
            filename=filename,
            revision=INSTANTID_MODEL_REVISION,
            local_dir=target,
        )


def _prepare_controlnet(target: Path) -> None:
    snapshot_download(
        repo_id="xinsir/controlnet-canny-sdxl-1.0",
        revision=CANNY_REVISION,
        local_dir=target,
        allow_patterns=["config.json", "diffusion_pytorch_model.safetensors"],
        max_workers=1,
    )


def _prepare_birefnet(target: Path) -> None:
    snapshot_download(
        repo_id="ZhengPeng7/BiRefNet",
        revision=BIREFNET_REVISION,
        local_dir=target,
        allow_patterns=["config.json", "*.py", "model.safetensors"],
        max_workers=1,
    )


def _prepare_sdxl(target: Path) -> None:
    snapshot_download(
        repo_id="stabilityai/stable-diffusion-xl-base-1.0",
        revision=SDXL_REVISION,
        local_dir=target,
        max_workers=1,
    )


def _required_manual_assets(root: Path) -> list[Path]:
    return [
        root / "insightface" / "models" / "antelopev2" / "glintr100.onnx",
        root / "insightface" / "models" / "antelopev2" / "scrfd_10g_bnkps.onnx",
        root / "lora" / "StickersRedmond.safetensors",
    ]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--model-root",
        type=Path,
        default=Path("models"),
        help="Project-relative model directory (default: ./models).",
    )
    parser.add_argument(
        "--include-sdxl",
        action="store_true",
        help="Download the large gated SDXL base snapshot.",
    )
    args = parser.parse_args()
    root = args.model_root.expanduser().resolve()
    root.mkdir(parents=True, exist_ok=True)

    _prepare_code(root / "InstantID")
    _prepare_instantid_weights(root / "instantid")
    _prepare_controlnet(root / "controlnet-canny-sdxl")
    _prepare_birefnet(root / "birefnet")
    if args.include_sdxl:
        _prepare_sdxl(root / "sdxl-base")

    missing = [path for path in _required_manual_assets(root) if not path.is_file()]
    if not (root / "sdxl-base" / "model_index.json").is_file():
        missing.append(root / "sdxl-base" / "model_index.json")

    if missing:
        print("Downloaded public assets. Add the following reviewed assets manually:")
        for path in missing:
            print(f"- {path}")
    else:
        print(f"InstantID model tree is complete: {root}")


if __name__ == "__main__":
    main()
