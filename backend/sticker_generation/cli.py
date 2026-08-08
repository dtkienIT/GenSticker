from __future__ import annotations

import argparse
import asyncio
import os
from pathlib import Path

from sticker_generation.catalog import DEFAULT_STICKER_CATALOG
from sticker_generation.pipeline import StickerPackGenerator
from sticker_generation.pose_references import extract_pose_references
from sticker_generation.providers.fal_queue import FalQueueImageProvider
from sticker_generation.providers.gemini import GeminiImageProvider
from sticker_generation.providers.openai_image import OpenAIImageProvider


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Generate a consistent API sticker pack")
    subparsers = parser.add_subparsers(dest="command", required=True)

    extract = subparsers.add_parser("extract-pose-refs")
    extract.add_argument("--sheet", type=Path, required=True)
    extract.add_argument("--out", type=Path, required=True)

    canonical = subparsers.add_parser("canonical")
    canonical.add_argument("--selfie", type=Path, required=True)
    canonical.add_argument("--out", type=Path, required=True)
    canonical.add_argument(
        "--provider", choices=("fal", "gemini", "openai"), default="fal"
    )
    canonical.add_argument("--model")
    canonical.add_argument("--candidates", type=int, default=3)

    pack = subparsers.add_parser("pack")
    pack.add_argument("--selfie", type=Path, required=True)
    pack.add_argument("--canonical", type=Path, required=True)
    pack.add_argument("--pose-refs", type=Path, required=True)
    pack.add_argument("--out", type=Path, required=True)
    pack.add_argument(
        "--provider", choices=("fal", "gemini", "openai"), default="fal"
    )
    pack.add_argument("--model")
    pack.add_argument("--concurrency", type=int, default=3)
    pack.add_argument("--retries", type=int, default=1)
    return parser


def main() -> None:
    args = build_parser().parse_args()
    if args.command == "extract-pose-refs":
        paths = extract_pose_references(args.sheet, args.out)
        print(f"created {len(paths)} pose references in {args.out}")
        return

    asyncio.run(_run_remote(args))


async def _run_remote(args: argparse.Namespace) -> None:
    key_names = {
        "fal": "FAL_KEY",
        "gemini": "GEMINI_API_KEY",
        "openai": "OPENAI_API_KEY",
    }
    key_name = key_names[args.provider]
    for env_path in _candidate_env_paths():
        _load_key_from_env_file(env_path, key_name)
        if os.environ.get(key_name):
            break
    if args.provider == "openai":
        for env_path in _candidate_env_paths():
            _load_openai_base_url_from_env_file(env_path)
            if os.environ.get("OPENAI_BASE_URL"):
                break
    api_key = os.environ.get(key_name, "")
    model_id = _resolve_model(args.provider, args.model)
    provider: GeminiImageProvider | FalQueueImageProvider | OpenAIImageProvider
    if args.provider == "gemini":
        provider = GeminiImageProvider(api_key=api_key, model_id=model_id)
    elif args.provider == "openai":
        provider = OpenAIImageProvider(
            api_key=api_key,
            model_id=model_id,
            base_url=os.environ.get(
                "OPENAI_BASE_URL",
                "https://api.openai.com/v1",
            ),
        )
    else:
        extra_input, estimated_cost = _model_defaults(model_id)
        provider = FalQueueImageProvider(
            api_key=api_key,
            model_id=model_id,
            extra_input=extra_input,
            estimated_cost_per_image_usd=estimated_cost,
        )
    generator = StickerPackGenerator(
        provider=provider,
        max_quality_retries=args.retries if args.command == "pack" else 1,
        concurrency=args.concurrency if args.command == "pack" else 1,
    )
    try:
        if args.command == "canonical":
            paths = await generator.generate_canonical_candidates(
                selfie_path=args.selfie,
                output_dir=args.out,
                candidate_count=args.candidates,
            )
            print("\n".join(str(path) for path in paths))
        else:
            result = await generator.generate_pack(
                selfie_path=args.selfie,
                canonical_path=args.canonical,
                pose_reference_dir=args.pose_refs,
                output_dir=args.out,
                templates=DEFAULT_STICKER_CATALOG,
            )
            print(result.manifest_path)
    finally:
        await provider.close()


def _model_defaults(model_id: str) -> tuple[dict[str, object], float]:
    lowered = model_id.lower()
    if "gpt-image-2" in lowered:
        return {"quality": "medium"}, 0.061
    if "nano-banana" in lowered:
        return {"resolution": "1K"}, 0.15
    if "kontext/max" in lowered:
        return {}, 0.08
    return {}, 0.0


def _resolve_model(provider: str, model_id: str | None) -> str:
    if model_id:
        return model_id
    if provider == "gemini":
        return "gemini-2.5-flash-image"
    if provider == "openai":
        return "gpt-image-1.5"
    return "fal-ai/nano-banana-pro/edit"


def _load_fal_key_from_env_file(path: Path) -> None:
    """Load only FAL_KEY, without importing unrelated project credentials."""
    _load_key_from_env_file(path, "FAL_KEY")


def _load_gemini_key_from_env_file(path: Path) -> None:
    """Load only GEMINI_API_KEY, without importing unrelated credentials."""
    _load_key_from_env_file(path, "GEMINI_API_KEY")


def _load_openai_key_from_env_file(path: Path) -> None:
    """Load only OPENAI_API_KEY, without importing unrelated credentials."""
    _load_key_from_env_file(path, "OPENAI_API_KEY")


def _load_openai_base_url_from_env_file(path: Path) -> None:
    """Load only OPENAI_BASE_URL, without importing unrelated credentials."""
    _load_key_from_env_file(path, "OPENAI_BASE_URL")


def _load_key_from_env_file(path: Path, key_name: str) -> None:
    if os.environ.get(key_name) or not path.is_file():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        if key.strip() != key_name:
            continue
        cleaned = value.strip().strip('"').strip("'")
        if cleaned:
            os.environ[key_name] = cleaned
        return


def _candidate_env_paths() -> tuple[Path, ...]:
    package_file = Path(__file__).resolve()
    return (
        Path.cwd() / ".env",
        package_file.parents[2] / ".env",
        package_file.parents[3] / ".env",
    )


if __name__ == "__main__":
    main()
