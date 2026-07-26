from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
import onnx
import pytest
from onnx import TensorProto, helper

from model_tools.export_spec import OnnxSignature
from model_tools.onnx_validation import (
    normalize_fp16_model,
    validate_onnx_model,
)
from model_tools.repair_text_encoder import repair_text_encoder_bundle


def mixed_layer_norm_fixture(path: Path) -> OnnxSignature:
    activation = helper.make_tensor_value_info(
        "activation",
        TensorProto.FLOAT,
        [1, 2, 4],
    )
    output = helper.make_tensor_value_info("output", TensorProto.FLOAT, [1, 2, 4])
    weight = helper.make_tensor("weight", TensorProto.FLOAT16, [4], [0x3C00] * 4, raw=False)
    bias = helper.make_tensor("bias", TensorProto.FLOAT16, [4], [0] * 4, raw=False)
    graph = helper.make_graph(
        [
            helper.make_node(
                "LayerNormalization",
                ["activation", "weight", "bias"],
                ["output"],
                name="mixed_layer_norm",
                axis=-1,
                epsilon=1e-5,
            )
        ],
        "mixed-layer-norm-fixture",
        [activation],
        [output],
        [weight, bias],
    )
    onnx.save(helper.make_model(graph, opset_imports=[helper.make_opsetid("", 18)]), path)
    return OnnxSignature(
        inputs={"activation": (1, 2, 4)},
        outputs={"output": (1, 2, 4)},
        input_types={"activation": "float16"},
        output_types={"output": "float16"},
    )


def test_validation_rejects_mixed_layer_norm_and_wrong_io_dtype(tmp_path: Path) -> None:
    path = tmp_path / "mixed.onnx"
    expected = mixed_layer_norm_fixture(path)

    with pytest.raises(ValueError, match="float16"):
        validate_onnx_model(path, expected)


def test_normalization_produces_executable_finite_fp16_graph(tmp_path: Path) -> None:
    path = tmp_path / "mixed.onnx"
    expected = mixed_layer_norm_fixture(path)

    normalize_fp16_model(
        path,
        expected,
        smoke_inputs={"activation": np.ones((1, 2, 4), dtype=np.float16)},
    )

    outputs = validate_onnx_model(
        path,
        expected,
        smoke_inputs={"activation": np.ones((1, 2, 4), dtype=np.float16)},
    )
    assert outputs["output"].dtype == np.float16
    assert outputs["output"].shape == (1, 2, 4)
    assert np.isfinite(outputs["output"]).all()


def test_normalization_is_byte_deterministic_and_idempotent(tmp_path: Path) -> None:
    path = tmp_path / "mixed.onnx"
    expected = mixed_layer_norm_fixture(path)
    inputs = {"activation": np.ones((1, 2, 4), dtype=np.float16)}

    normalize_fp16_model(path, expected, smoke_inputs=inputs)
    first_digest = hashlib.sha256(path.read_bytes()).hexdigest()
    normalize_fp16_model(path, expected, smoke_inputs=inputs)

    assert hashlib.sha256(path.read_bytes()).hexdigest() == first_digest


def test_invalid_input_is_not_replaced(tmp_path: Path) -> None:
    path = tmp_path / "corrupt.onnx"
    original = b"not an onnx graph"
    path.write_bytes(original)
    expected = OnnxSignature(
        inputs={"input": (1,)},
        outputs={"output": (1,)},
        input_types={"input": "float16"},
        output_types={"output": "float16"},
    )

    with pytest.raises(ValueError, match="ONNX"):
        normalize_fp16_model(path, expected)

    assert path.read_bytes() == original


def test_bundle_repair_regenerates_manifest_for_corrected_encoder(
    tmp_path: Path,
) -> None:
    encoder = tmp_path / "text_encoder" / "model.onnx"
    encoder.parent.mkdir()
    mixed_layer_norm_fixture(encoder)
    (tmp_path / "runtime-config.json").write_text("{}", encoding="utf-8")

    manifest_path = repair_text_encoder_bundle(
        tmp_path,
        expected=OnnxSignature(
            inputs={"activation": (1, 2, 4)},
            outputs={"output": (1, 2, 4)},
            input_types={"activation": "float16"},
            output_types={"output": "float16"},
        ),
        smoke_inputs={"activation": np.ones((1, 2, 4), dtype=np.float16)},
    )

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    encoder_part = next(
        part for part in manifest["parts"] if part["path"] == "text_encoder/model.onnx"
    )
    assert manifest["modelVersion"] == "1.0.1"
    assert encoder_part["bytes"] == encoder.stat().st_size
    assert encoder_part["sha256"] == hashlib.sha256(encoder.read_bytes()).hexdigest()
