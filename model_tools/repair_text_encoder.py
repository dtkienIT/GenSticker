from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np

from .export_spec import ONNX_SIGNATURES, OnnxSignature
from .manifest import write_distribution_manifest, write_model_manifest
from .onnx_validation import normalize_fp16_model


def repair_text_encoder_bundle(
    bundle_root: Path,
    expected: OnnxSignature = ONNX_SIGNATURES["text_encoder"],
    smoke_inputs: dict[str, np.ndarray] | None = None,
) -> Path:
    encoder = bundle_root / "text_encoder" / "model.onnx"
    inputs = smoke_inputs or {
        "input_ids": np.zeros(expected.inputs["input_ids"], dtype=np.int64)
    }
    normalize_fp16_model(encoder, expected, inputs)
    write_model_manifest(bundle_root)
    return write_distribution_manifest(bundle_root)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("bundle_root", type=Path)
    arguments = parser.parse_args()
    print(repair_text_encoder_bundle(arguments.bundle_root.resolve()))


if __name__ == "__main__":
    main()
