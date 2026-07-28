from model_tools.coreml_export_spec import COREML_EXPORT_SPEC


def test_coreml_export_spec_pins_mobile_conversion_contract() -> None:
    assert COREML_EXPORT_SPEC.base_model_revision == (
        "451f4fe16113bff5a5d2269ed5ad43b0592e9a14"
    )
    assert COREML_EXPORT_SPEC.lcm_lora_revision == (
        "cf2fced511dbe7e26c8d1d397e728fbab875db4b"
    )
    assert COREML_EXPORT_SPEC.apple_converter_revision == "1.1.1"
    assert COREML_EXPORT_SPEC.width == COREML_EXPORT_SPEC.height == 512
    assert COREML_EXPORT_SPEC.inference_steps == 4
    assert COREML_EXPORT_SPEC.guidance_scale == 1.5
    assert COREML_EXPORT_SPEC.quantization_bits == 4
    assert COREML_EXPORT_SPEC.chunk_unet is True
    assert COREML_EXPORT_SPEC.attention_implementation == "SPLIT_EINSUM"
    assert COREML_EXPORT_SPEC.compute_units == "CPU_AND_NE"
    assert COREML_EXPORT_SPEC.minimum_ios == "17.0"

