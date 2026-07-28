from __future__ import annotations

import hashlib
import json
from pathlib import Path

import pytest

from model_tools import coreml_manifest as manifest_module
from model_tools.coreml_manifest import (
    build_coreml_distribution_manifest,
    build_coreml_model_manifest,
)


def test_coreml_model_manifest_preserves_source_and_generation_contract() -> None:
    manifest = build_coreml_model_manifest()

    assert manifest["modelId"] == "lcm-sd15-chibi"
    assert manifest["modelVersion"] == "1.0.1-coreml.1"
    assert manifest["runtime"] == {"name": "coreml-ios", "minimumIos": "17.0"}
    assert manifest["compression"] == {
        "weightBits": 4,
        "chunkUnet": True,
        "attentionImplementation": "SPLIT_EINSUM",
    }
    assert manifest["scheduler"] == {
        "type": "lcm",
        "steps": 4,
        "guidanceScale": 1.5,
    }
    assert manifest["output"] == {
        "width": 512,
        "height": 512,
        "stylePresetId": "chibi",
    }


def test_coreml_distribution_manifest_hashes_archive_and_internal_files(
    tmp_path: Path,
) -> None:
    archive = tmp_path / "lcm-sd15-chibi-coreml-ios-v1.0.1.zip"
    archive.write_bytes(b"archive")
    contents = tmp_path / "contents"
    (contents / "models").mkdir(parents=True)
    (contents / "models" / "TextEncoder.mlmodelc").write_bytes(b"clip")
    (contents / "tokenizer.json").write_bytes(b"tokenizer")

    manifest = build_coreml_distribution_manifest(archive, contents)

    assert manifest["artifactBytes"] == len(b"archive")
    assert manifest["artifactSha256"] == hashlib.sha256(b"archive").hexdigest()
    assert manifest["uncompressedBytes"] == len(b"clip") + len(b"tokenizer")
    assert manifest["minimumStorageBytes"] == (
        len(b"archive") + 2 * (len(b"clip") + len(b"tokenizer")) + 256 * 1024 * 1024
    )
    assert manifest["parts"] == [
        {
            "path": "models/TextEncoder.mlmodelc",
            "bytes": len(b"clip"),
            "sha256": hashlib.sha256(b"clip").hexdigest(),
        },
        {
            "path": "tokenizer.json",
            "bytes": len(b"tokenizer"),
            "sha256": hashlib.sha256(b"tokenizer").hexdigest(),
        },
    ]
    assert manifest["url"].endswith(
        "/model-lcm-sd15-coreml-v1.0.1/"
        "lcm-sd15-chibi-coreml-ios-v1.0.1.zip"
    )


def test_coreml_distribution_manifest_is_deterministic(tmp_path: Path) -> None:
    archive = tmp_path / "lcm-sd15-chibi-coreml-ios-v1.0.1.zip"
    archive.write_bytes(b"archive")
    contents = tmp_path / "contents"
    contents.mkdir()
    (contents / "z").write_bytes(b"z")
    (contents / "a").write_bytes(b"a")

    first = build_coreml_distribution_manifest(archive, contents)
    second = build_coreml_distribution_manifest(archive, contents)

    assert json.dumps(first, sort_keys=True) == json.dumps(second, sort_keys=True)
    assert [part["path"] for part in first["parts"]] == ["a", "z"]


def test_coreml_distribution_manifest_rejects_github_limit(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    archive = tmp_path / "lcm-sd15-chibi-coreml-ios-v1.0.1.zip"
    archive.write_bytes(b"x")
    contents = tmp_path / "contents"
    contents.mkdir()
    monkeypatch.setattr(manifest_module, "GITHUB_RELEASE_ASSET_LIMIT", 1)

    with pytest.raises(ValueError, match="2 GiB"):
        build_coreml_distribution_manifest(archive, contents)
