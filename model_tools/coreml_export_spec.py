from __future__ import annotations

from dataclasses import dataclass

from .export_spec import EXPORT_SPEC


@dataclass(frozen=True)
class CoreMLExportSpec:
    base_model_id: str
    base_model_revision: str
    lcm_lora_id: str
    lcm_lora_revision: str
    apple_converter_revision: str
    width: int
    height: int
    inference_steps: int
    guidance_scale: float
    quantization_bits: int
    chunk_unet: bool
    attention_implementation: str
    compute_units: str
    minimum_ios: str


COREML_EXPORT_SPEC = CoreMLExportSpec(
    base_model_id=EXPORT_SPEC.base_model.model_id,
    base_model_revision=EXPORT_SPEC.base_model.revision,
    lcm_lora_id=EXPORT_SPEC.lcm_lora.model_id,
    lcm_lora_revision=EXPORT_SPEC.lcm_lora.revision,
    apple_converter_revision="1.1.1",
    width=EXPORT_SPEC.width,
    height=EXPORT_SPEC.height,
    inference_steps=EXPORT_SPEC.steps,
    guidance_scale=EXPORT_SPEC.guidance_scale,
    quantization_bits=4,
    chunk_unet=True,
    attention_implementation="SPLIT_EINSUM",
    compute_units="CPU_AND_NE",
    minimum_ios="17.0",
)

