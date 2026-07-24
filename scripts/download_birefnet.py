"""Download the public BiRefNet snapshot to the configured external model directory."""

from pathlib import Path

from huggingface_hub import snapshot_download

from backend.app.core.config import settings


def main() -> None:
    target = Path(settings.BIREFNET_MODEL_PATH).expanduser().resolve()
    target.mkdir(parents=True, exist_ok=True)
    snapshot_download(
        "ZhengPeng7/BiRefNet",
        local_dir=target,
        allow_patterns=["config.json", "*.py", "model.safetensors"],
        max_workers=1,
    )
    required = [target / "config.json", target / "model.safetensors"]
    missing = [str(path) for path in required if not path.is_file()]
    if missing:
        raise RuntimeError(f"BiRefNet download is incomplete: {', '.join(missing)}")
    print(f"BiRefNet ready: {target}")


if __name__ == "__main__":
    main()
