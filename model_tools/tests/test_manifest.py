from __future__ import annotations

import hashlib
import json
from pathlib import Path

import pytest

from model_tools import manifest as manifest_module
from model_tools.manifest import build_distribution_manifest, build_model_manifest


def write_part(path: Path, content: bytes) -> dict[str, object]:
    path.write_bytes(content)
    return {
        "name": path.name,
        "bytes": len(content),
        "sha256": hashlib.sha256(content).hexdigest(),
    }


def test_builds_deterministic_manifest_from_sorted_parts(tmp_path: Path) -> None:
    write_part(tmp_path / "unet.onnx", b"unet")
    write_part(tmp_path / "text_encoder.onnx", b"text")

    manifest = build_distribution_manifest(tmp_path)

    assert [part["name"] for part in manifest["parts"]] == [
        "text_encoder.onnx",
        "unet.onnx",
    ]
    canonical = json.dumps(manifest["parts"], separators=(",", ":"), sort_keys=True).encode()
    assert manifest["artifactSha256"] == hashlib.sha256(canonical).hexdigest()


def test_rejects_release_part_at_github_limit(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    part = tmp_path / "unet.onnx"
    part.write_bytes(b"x")
    monkeypatch.setattr(manifest_module, "GITHUB_RELEASE_PART_LIMIT", 1)

    with pytest.raises(ValueError, match="2 GiB"):
        build_distribution_manifest(tmp_path)


def test_includes_nested_files_with_collision_safe_release_names(tmp_path: Path) -> None:
    (tmp_path / "unet").mkdir()
    (tmp_path / "text_encoder").mkdir()
    (tmp_path / "unet" / "model.onnx").write_bytes(b"unet")
    (tmp_path / "text_encoder" / "model.onnx").write_bytes(b"clip")

    manifest = build_distribution_manifest(tmp_path)

    assert [part["path"] for part in manifest["parts"]] == [
        "text_encoder/model.onnx",
        "unet/model.onnx",
    ]
    assert [part["name"] for part in manifest["parts"]] == [
        "text_encoder--model.onnx",
        "unet--model.onnx",
    ]


def test_model_manifest_records_sources_runtime_and_fixed_pipeline() -> None:
    manifest = build_model_manifest()

    assert manifest["modelVersion"] == "1.0.1"
    assert manifest["baseModel"]["revision"] == "451f4fe16113bff5a5d2269ed5ad43b0592e9a14"
    assert manifest["lcmLora"]["revision"] == "cf2fced511dbe7e26c8d1d397e728fbab875db4b"
    assert manifest["scheduler"] == {"type": "lcm", "steps": 4, "guidanceScale": 1.5}
    assert manifest["output"] == {"width": 512, "height": 512, "stylePresetId": "chibi"}
    assert manifest["runtime"] == {"name": "onnxruntime-android", "version": "1.27.0"}
    assert manifest["licenses"] == ["creativeml-openrail-m", "openrail++"]


def test_distribution_manifest_identifies_tokenizer_and_scheduler_assets(tmp_path: Path) -> None:
    (tmp_path / "tokenizer").mkdir()
    (tmp_path / "scheduler").mkdir()
    (tmp_path / "tokenizer" / "tokenizer.json").write_text("{}", encoding="utf-8")
    (tmp_path / "scheduler" / "scheduler_config.json").write_text("{}", encoding="utf-8")

    manifest = build_distribution_manifest(tmp_path)

    assert manifest["tokenizerAssets"] == ["tokenizer/tokenizer.json"]
    assert manifest["schedulerAssets"] == ["scheduler/scheduler_config.json"]


def test_corrected_bundle_uses_new_immutable_version_and_release_urls(
    tmp_path: Path,
) -> None:
    (tmp_path / "text_encoder.onnx").write_bytes(b"corrected")

    manifest = build_distribution_manifest(tmp_path)

    assert manifest["modelVersion"] == "1.0.1"
    assert manifest["parts"][0]["url"].startswith(
        "https://github.com/dtkienIT/GenSticker/releases/download/"
        "model-lcm-sd15-v1.0.1/"
    )
