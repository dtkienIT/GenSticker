from model_tools.export_spec import EXPORT_SPEC, ONNX_SIGNATURES


def test_lora_export_dependencies_are_available() -> None:
    import accelerate
    import peft

    assert accelerate.__version__ == "1.14.0"
    assert peft.__version__ == "0.19.1"


def test_export_spec_pins_model_sources_and_mobile_shape() -> None:
    assert EXPORT_SPEC.base_model.revision == "451f4fe16113bff5a5d2269ed5ad43b0592e9a14"
    assert EXPORT_SPEC.lcm_lora.revision == "cf2fced511dbe7e26c8d1d397e728fbab875db4b"
    assert EXPORT_SPEC.width == EXPORT_SPEC.height == 512
    assert EXPORT_SPEC.steps == 4
    assert EXPORT_SPEC.guidance_scale == 1.5
    assert EXPORT_SPEC.style_preset_id == "chibi"


def test_onnx_signatures_are_fixed_for_512_pixel_sd15() -> None:
    assert ONNX_SIGNATURES["text_encoder"].inputs == {"input_ids": (2, 77)}
    assert ONNX_SIGNATURES["text_encoder"].outputs == {
        "last_hidden_state": (2, 77, 768)
    }
    assert ONNX_SIGNATURES["text_encoder"].input_types == {"input_ids": "int64"}
    assert ONNX_SIGNATURES["text_encoder"].output_types == {
        "last_hidden_state": "float16"
    }
    assert ONNX_SIGNATURES["unet"].inputs == {
        "sample": (2, 4, 64, 64),
        "timestep": (1,),
        "encoder_hidden_states": (2, 77, 768),
    }
    assert ONNX_SIGNATURES["unet"].outputs == {"out_sample": (2, 4, 64, 64)}
    assert ONNX_SIGNATURES["unet"].input_types == {
        "sample": "float16",
        "timestep": "float32",
        "encoder_hidden_states": "float16",
    }
    assert ONNX_SIGNATURES["unet"].output_types == {"out_sample": "float16"}
    assert ONNX_SIGNATURES["vae_decoder"].inputs == {"latent_sample": (1, 4, 64, 64)}
    assert ONNX_SIGNATURES["vae_decoder"].outputs == {"sample": (1, 3, 512, 512)}
    assert ONNX_SIGNATURES["vae_decoder"].input_types == {
        "latent_sample": "float16"
    }
    assert ONNX_SIGNATURES["vae_decoder"].output_types == {"sample": "float16"}
