from pathlib import Path

from sticker_generation.cli import (
    _candidate_env_paths,
    _load_fal_key_from_env_file,
    _load_gemini_key_from_env_file,
    _load_openai_key_from_env_file,
    _model_defaults,
    _resolve_model,
    build_parser,
)


def test_load_fal_key_from_env_file_without_loading_other_secrets(
    tmp_path: Path, monkeypatch
) -> None:  # type: ignore[no-untyped-def]
    env_file = tmp_path / ".env"
    env_file.write_text("OTHER_SECRET=hidden\nFAL_KEY='fal-test-key'\n", encoding="utf-8")
    monkeypatch.delenv("FAL_KEY", raising=False)
    monkeypatch.delenv("OTHER_SECRET", raising=False)

    _load_fal_key_from_env_file(env_file)

    assert __import__("os").environ["FAL_KEY"] == "fal-test-key"
    assert "OTHER_SECRET" not in __import__("os").environ


def test_cli_parser_and_model_profiles() -> None:
    args = build_parser().parse_args(
        ["canonical", "--selfie", "selfie.png", "--out", "out"]
    )

    assert args.command == "canonical"
    assert args.provider == "fal"
    assert _resolve_model("fal", None) == "fal-ai/nano-banana-pro/edit"
    assert _resolve_model("gemini", None) == "gemini-2.5-flash-image"
    assert _resolve_model("gemini", "custom-gemini") == "custom-gemini"
    assert _resolve_model("openai", None) == "gpt-image-1.5"
    assert _model_defaults("openai/gpt-image-2/edit") == ({"quality": "medium"}, 0.061)
    assert _model_defaults("fal-ai/nano-banana-pro/edit") == ({"resolution": "1K"}, 0.15)
    assert _model_defaults("fal-ai/flux-pro/kontext/max") == ({}, 0.08)
    assert _model_defaults("custom/model") == ({}, 0.0)


def test_load_gemini_key_without_loading_other_secrets(
    tmp_path: Path, monkeypatch
) -> None:  # type: ignore[no-untyped-def]
    env_file = tmp_path / ".env"
    env_file.write_text(
        "OTHER_SECRET=hidden\nGEMINI_API_KEY='gemini-test-key'\n",
        encoding="utf-8",
    )
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("OTHER_SECRET", raising=False)

    _load_gemini_key_from_env_file(env_file)

    assert __import__("os").environ["GEMINI_API_KEY"] == "gemini-test-key"
    assert "OTHER_SECRET" not in __import__("os").environ


def test_load_openai_key_without_loading_other_secrets(
    tmp_path: Path, monkeypatch
) -> None:  # type: ignore[no-untyped-def]
    env_file = tmp_path / ".env"
    env_file.write_text(
        "OTHER_SECRET=hidden\nOPENAI_API_KEY='openai-test-key'\n",
        encoding="utf-8",
    )
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("OTHER_SECRET", raising=False)

    _load_openai_key_from_env_file(env_file)

    assert __import__("os").environ["OPENAI_API_KEY"] == "openai-test-key"
    assert "OTHER_SECRET" not in __import__("os").environ


def test_candidate_env_paths_include_repository_root() -> None:
    candidates = _candidate_env_paths()
    assert candidates[0].name == ".env"
    assert any(path.parent.name == "GenSticker_kien_v4" for path in candidates)
