from __future__ import annotations

import argparse
import gc
import json
import shutil
from pathlib import Path

from .export_spec import EXPORT_SPEC, ONNX_SIGNATURES, OnnxSignature
from .manifest import write_distribution_manifest, write_model_manifest
from .onnx_validation import normalize_fp16_model, validate_onnx_model


def release_component(pipeline: object, name: str) -> None:
    """Release an exported pipeline component before tracing the next large graph."""
    setattr(pipeline, name, None)
    gc.collect()


def has_expected_signature(path: Path, expected: OnnxSignature) -> bool:
    try:
        validate_onnx_model(path, expected)
    except Exception:
        return False
    return True


def export_pipeline(output_dir: Path) -> Path:
    """Fuse the pinned LCM adapter, export fixed-shape FP16 ONNX parts, and manifest them."""
    import torch
    from diffusers import LCMScheduler, StableDiffusionPipeline

    work_dir = output_dir / ".fused-diffusers"
    output_dir.mkdir(parents=True, exist_ok=True)

    if work_dir.exists():
        shutil.rmtree(work_dir)
    pipeline = StableDiffusionPipeline.from_pretrained(
        EXPORT_SPEC.base_model.model_id,
        revision=EXPORT_SPEC.base_model.revision,
        torch_dtype=torch.float16,
        variant="fp16",
        safety_checker=None,
    )
    pipeline.load_lora_weights(
        EXPORT_SPEC.lcm_lora.model_id,
        revision=EXPORT_SPEC.lcm_lora.revision,
    )
    pipeline.fuse_lora()
    pipeline.scheduler = LCMScheduler.from_config(pipeline.scheduler.config)
    pipeline.text_encoder.eval()
    pipeline.unet.eval()
    pipeline.vae.eval()

    class TextEncoderWrapper(torch.nn.Module):
        def __init__(self, module: torch.nn.Module) -> None:
            super().__init__()
            self.module = module

        def forward(self, input_ids: torch.Tensor) -> torch.Tensor:
            return self.module(input_ids=input_ids, return_dict=False)[0]

    class UnetWrapper(torch.nn.Module):
        def __init__(self, module: torch.nn.Module) -> None:
            super().__init__()
            self.module = module

        def forward(
            self,
            sample: torch.Tensor,
            timestep: torch.Tensor,
            encoder_hidden_states: torch.Tensor,
        ) -> torch.Tensor:
            return self.module(
                sample=sample,
                timestep=timestep,
                encoder_hidden_states=encoder_hidden_states,
                return_dict=False,
            )[0]

    class VaeDecoderWrapper(torch.nn.Module):
        def __init__(self, module: torch.nn.Module) -> None:
            super().__init__()
            self.module = module

        def forward(self, latent_sample: torch.Tensor) -> torch.Tensor:
            return self.module.decode(latent_sample, return_dict=False)[0]

    def export_onnx(
        name: str,
        module: torch.nn.Module,
        args: tuple[torch.Tensor, ...],
        input_names: list[str],
        output_names: list[str],
    ) -> None:
        component_dir = output_dir / name
        component_dir.mkdir(parents=True, exist_ok=True)
        output_path = component_dir / "model.onnx"
        if has_expected_signature(output_path, ONNX_SIGNATURES[name]):
            return
        torch.onnx.export(
            module,
            args,
            output_path,
            input_names=input_names,
            output_names=output_names,
            opset_version=18,
            dynamo=False,
            external_data=True,
            do_constant_folding=True,
        )
        if name == "text_encoder":
            import numpy as np

            normalize_fp16_model(
                output_path,
                ONNX_SIGNATURES[name],
                smoke_inputs={"input_ids": np.zeros((2, 77), dtype=np.int64)},
            )

    with torch.inference_mode():
        export_onnx(
            "text_encoder",
            TextEncoderWrapper(pipeline.text_encoder),
            (torch.zeros((2, 77), dtype=torch.long),),
            ["input_ids"],
            ["last_hidden_state"],
        )
        release_component(pipeline, "text_encoder")
        export_onnx(
            "unet",
            UnetWrapper(pipeline.unet),
            (
                torch.zeros((2, 4, 64, 64), dtype=torch.float16),
                torch.zeros((1,), dtype=torch.float32),
                torch.zeros((2, 77, 768), dtype=torch.float16),
            ),
            ["sample", "timestep", "encoder_hidden_states"],
            ["out_sample"],
        )
        release_component(pipeline, "unet")
        export_onnx(
            "vae_decoder",
            VaeDecoderWrapper(pipeline.vae),
            (torch.zeros((1, 4, 64, 64), dtype=torch.float16),),
            ["latent_sample"],
            ["sample"],
        )

    pipeline.tokenizer.save_pretrained(output_dir / "tokenizer")
    pipeline.scheduler.save_pretrained(output_dir / "scheduler")
    write_model_manifest(output_dir)
    (output_dir / "runtime-config.json").write_text(
        json.dumps(
            {
                "width": EXPORT_SPEC.width,
                "height": EXPORT_SPEC.height,
                "steps": EXPORT_SPEC.steps,
                "guidanceScale": EXPORT_SPEC.guidance_scale,
                "stylePresetId": EXPORT_SPEC.style_preset_id,
                "positivePromptSuffix": "chibi sticker, bold clean outline, centered subject",
                "negativePrompt": "photorealistic, text, watermark, gore, explicit content",
            },
            indent=2,
            sort_keys=True,
        )
        + "\n",
        encoding="utf-8",
    )
    shutil.rmtree(work_dir)
    return write_distribution_manifest(output_dir)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    manifest = export_pipeline(args.output.resolve())
    print(manifest)


if __name__ == "__main__":
    main()
