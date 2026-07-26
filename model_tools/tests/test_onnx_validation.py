from pathlib import Path

import onnx
from onnx import TensorProto, helper

from model_tools.export_lcm_sd15 import has_expected_signature, release_component
from model_tools.export_spec import OnnxSignature


def write_identity_model(path: Path, input_shape: tuple[int, ...], output_shape: tuple[int, ...]) -> None:
    graph = helper.make_graph(
        [helper.make_node("Identity", ["input"], ["output"])],
        "fixture",
        [helper.make_tensor_value_info("input", TensorProto.FLOAT, input_shape)],
        [helper.make_tensor_value_info("output", TensorProto.FLOAT, output_shape)],
    )
    onnx.save(helper.make_model(graph), path)


def test_accepts_only_exact_fixed_onnx_signature(tmp_path: Path) -> None:
    path = tmp_path / "model.onnx"
    write_identity_model(path, (1, 4, 64, 64), (1, 4, 64, 64))
    expected = OnnxSignature(
        inputs={"input": (1, 4, 64, 64)},
        outputs={"output": (1, 4, 64, 64)},
        input_types={"input": "float32"},
        output_types={"output": "float32"},
    )

    assert has_expected_signature(path, expected)
    assert not has_expected_signature(
        path,
        OnnxSignature(
            inputs={"input": (2, 4, 64, 64)},
            outputs=expected.outputs,
            input_types=expected.input_types,
            output_types=expected.output_types,
        ),
    )


def test_rejects_missing_or_corrupt_onnx(tmp_path: Path) -> None:
    expected = OnnxSignature(
        inputs={"input": (1,)},
        outputs={"output": (1,)},
        input_types={"input": "float32"},
        output_types={"output": "float32"},
    )
    missing = tmp_path / "missing.onnx"
    corrupt = tmp_path / "corrupt.onnx"
    corrupt.write_bytes(b"not an onnx graph")

    assert not has_expected_signature(missing, expected)
    assert not has_expected_signature(corrupt, expected)


def test_release_component_drops_pipeline_reference() -> None:
    class Pipeline:
        text_encoder = object()

    pipeline = Pipeline()

    release_component(pipeline, "text_encoder")

    assert pipeline.text_encoder is None
