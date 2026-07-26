from __future__ import annotations

import os
import tempfile
from pathlib import Path
from typing import TYPE_CHECKING

import numpy as np
import onnx
import onnxruntime as ort
from onnx import TensorProto, shape_inference
from onnxruntime.transformers.float16 import convert_float_to_float16

from .export_spec import OnnxSignature

if TYPE_CHECKING:
    from numpy.typing import NDArray


TENSOR_TYPES = {
    TensorProto.FLOAT: "float32",
    TensorProto.FLOAT16: "float16",
    TensorProto.INT64: "int64",
}


def _load_model(path: Path) -> onnx.ModelProto:
    if not path.is_file():
        raise ValueError(f"ONNX model is missing: {path}")
    try:
        return onnx.load(path, load_external_data=True)
    except Exception as error:
        raise ValueError(f"Invalid ONNX model: {path}") from error


def _shape(value: onnx.ValueInfoProto) -> tuple[int, ...]:
    return tuple(dimension.dim_value for dimension in value.type.tensor_type.shape.dim)


def _type(value: onnx.ValueInfoProto) -> str:
    element_type = value.type.tensor_type.elem_type
    return TENSOR_TYPES.get(element_type, TensorProto.DataType.Name(element_type).lower())


def _require_io_contract(
    model: onnx.ModelProto,
    expected: OnnxSignature,
) -> None:
    inputs = {value.name: _shape(value) for value in model.graph.input}
    outputs = {value.name: _shape(value) for value in model.graph.output}
    input_types = {value.name: _type(value) for value in model.graph.input}
    output_types = {value.name: _type(value) for value in model.graph.output}
    if inputs != expected.inputs:
        raise ValueError(f"ONNX input shapes do not match: {inputs}")
    if outputs != expected.outputs:
        raise ValueError(f"ONNX output shapes do not match: {outputs}")
    if input_types != expected.input_types:
        raise ValueError(f"ONNX input types must match {expected.input_types}: {input_types}")
    if output_types != expected.output_types:
        raise ValueError(f"ONNX output types must match {expected.output_types}: {output_types}")


def _require_homogeneous_layer_norms(model: onnx.ModelProto) -> None:
    values = {
        value.name: _type(value)
        for value in [*model.graph.input, *model.graph.output, *model.graph.value_info]
    }
    values.update(
        {
            initializer.name: TENSOR_TYPES.get(
                initializer.data_type,
                TensorProto.DataType.Name(initializer.data_type).lower(),
            )
            for initializer in model.graph.initializer
        }
    )
    for node in model.graph.node:
        if node.op_type != "LayerNormalization":
            continue
        types = [values.get(name, "unknown") for name in node.input[:3]]
        if len(set(types)) != 1:
            raise ValueError(
                f"LayerNormalization {node.name} requires one tensor type, found {types}"
            )


def validate_onnx_model(
    path: Path,
    expected: OnnxSignature,
    smoke_inputs: dict[str, NDArray[np.generic]] | None = None,
) -> dict[str, NDArray[np.generic]]:
    model = _load_model(path)
    try:
        onnx.checker.check_model(model)
        inferred = shape_inference.infer_shapes(model, strict_mode=True, data_prop=True)
    except Exception as error:
        raise ValueError(f"Invalid ONNX graph: {path}") from error
    _require_io_contract(inferred, expected)
    _require_homogeneous_layer_norms(inferred)

    try:
        session = ort.InferenceSession(str(path), providers=["CPUExecutionProvider"])
    except Exception as error:
        raise ValueError(f"ONNX Runtime could not load model: {path}") from error

    if smoke_inputs is None:
        return {}
    try:
        raw_outputs = session.run(None, smoke_inputs)
    except Exception as error:
        raise ValueError(f"ONNX Runtime smoke inference failed: {path}") from error
    outputs = {
        output.name: value
        for output, value in zip(session.get_outputs(), raw_outputs, strict=True)
    }
    if any(
        np.issubdtype(value.dtype, np.floating) and not np.isfinite(value).all()
        for value in outputs.values()
    ):
        raise ValueError(f"ONNX Runtime smoke inference returned non-finite output: {path}")
    return outputs


def normalize_fp16_model(
    path: Path,
    expected: OnnxSignature,
    smoke_inputs: dict[str, NDArray[np.generic]] | None = None,
) -> Path:
    try:
        validate_onnx_model(path, expected, smoke_inputs)
        return path
    except ValueError:
        model = _load_model(path)

    try:
        normalized = convert_float_to_float16(
            model,
            keep_io_types=False,
            disable_shape_infer=False,
        )
    except Exception as error:
        raise ValueError(f"ONNX FP16 conversion failed: {path}") from error

    descriptor, temporary_name = tempfile.mkstemp(
        prefix=f".{path.name}.",
        suffix=".repairing",
        dir=path.parent,
    )
    os.close(descriptor)
    temporary = Path(temporary_name)
    try:
        onnx.save(normalized, temporary)
        validate_onnx_model(temporary, expected, smoke_inputs)
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)
    return path
