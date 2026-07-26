from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ModelSource:
    model_id: str
    revision: str
    license_id: str


@dataclass(frozen=True)
class ExportSpec:
    base_model: ModelSource
    lcm_lora: ModelSource
    width: int
    height: int
    steps: int
    guidance_scale: float
    style_preset_id: str


@dataclass(frozen=True)
class OnnxSignature:
    inputs: dict[str, tuple[int, ...]]
    outputs: dict[str, tuple[int, ...]]
    input_types: dict[str, str]
    output_types: dict[str, str]


ONNX_SIGNATURES = {
    "text_encoder": OnnxSignature(
        inputs={"input_ids": (2, 77)},
        outputs={"last_hidden_state": (2, 77, 768)},
        input_types={"input_ids": "int64"},
        output_types={"last_hidden_state": "float16"},
    ),
    "unet": OnnxSignature(
        inputs={
            "sample": (2, 4, 64, 64),
            "timestep": (1,),
            "encoder_hidden_states": (2, 77, 768),
        },
        outputs={"out_sample": (2, 4, 64, 64)},
        input_types={
            "sample": "float16",
            "timestep": "float32",
            "encoder_hidden_states": "float16",
        },
        output_types={"out_sample": "float16"},
    ),
    "vae_decoder": OnnxSignature(
        inputs={"latent_sample": (1, 4, 64, 64)},
        outputs={"sample": (1, 3, 512, 512)},
        input_types={"latent_sample": "float16"},
        output_types={"sample": "float16"},
    ),
}


EXPORT_SPEC = ExportSpec(
    base_model=ModelSource(
        model_id="stable-diffusion-v1-5/stable-diffusion-v1-5",
        revision="451f4fe16113bff5a5d2269ed5ad43b0592e9a14",
        license_id="creativeml-openrail-m",
    ),
    lcm_lora=ModelSource(
        model_id="latent-consistency/lcm-lora-sdv1-5",
        revision="cf2fced511dbe7e26c8d1d397e728fbab875db4b",
        license_id="openrail++",
    ),
    width=512,
    height=512,
    steps=4,
    guidance_scale=1.5,
    style_preset_id="chibi",
)
