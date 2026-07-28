from __future__ import annotations

import json
from pathlib import Path

import pytest

from model_tools.coreml_manifest import ARCHIVE_NAME
from model_tools.export_coreml_lcm_sd15 import (
    REQUIRED_RESOURCES,
    build_conversion_arguments,
    build_runtime_tokenizer,
    package_coreml_bundle,
)


def test_build_conversion_arguments_pins_mobile_coreml_flags(tmp_path: Path) -> None:
    args = build_conversion_arguments(tmp_path / "fused", tmp_path / "converted")

    assert args[:3] == [
        "python",
        "-m",
        "python_coreml_stable_diffusion.torch2coreml",
    ]
    assert args[args.index("--model-version") + 1] == str(tmp_path / "fused")
    assert args[args.index("-o") + 1] == str(tmp_path / "converted")
    assert "--convert-text-encoder" in args
    assert "--convert-unet" in args
    assert "--convert-vae-decoder" in args
    assert "--chunk-unet" in args
    assert args[args.index("--quantize-nbits") + 1] == "4"
    assert args[args.index("--attention-implementation") + 1] == "SPLIT_EINSUM"
    assert args[args.index("--compute-unit") + 1] == "CPU_AND_NE"
    assert "--check-output-correctness" in args


def test_package_coreml_bundle_requires_every_runtime_resource(tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="TextEncoder.mlmodelc"):
        package_coreml_bundle(tmp_path / "missing", tmp_path / "out")


def test_build_runtime_tokenizer_supports_diffusers_vocab_and_merges(
    tmp_path: Path,
) -> None:
    (tmp_path / "vocab.json").write_text(
        '{"<|startoftext|>":49406,"<|endoftext|>":49407,"cat</w>":2368}',
        encoding="utf-8",
    )
    (tmp_path / "merges.txt").write_text(
        "#version: 0.2\nc a\nca t</w>\n",
        encoding="utf-8",
    )

    tokenizer = build_runtime_tokenizer(tmp_path)

    assert tokenizer["model"]["vocab"]["cat</w>"] == 2368
    assert tokenizer["model"]["merges"] == [["c", "a"], ["ca", "t</w>"]]


def test_package_coreml_bundle_writes_archive_and_manifests(tmp_path: Path) -> None:
    resources = tmp_path / "resources"
    for relative in REQUIRED_RESOURCES:
        path = resources / relative
        if path.suffix == ".mlmodelc":
            path.mkdir(parents=True)
            (path / "model.mil").write_text(str(relative), encoding="utf-8")
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text("{}", encoding="utf-8")

    output = tmp_path / "out"
    manifest_path = package_coreml_bundle(resources, output)

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    assert (output / ARCHIVE_NAME).is_file()
    assert manifest["artifactBytes"] == (output / ARCHIVE_NAME).stat().st_size
    assert manifest["parts"]
    assert (output / "model.manifest.json").is_file()
