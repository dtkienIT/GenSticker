from __future__ import annotations

import hashlib
import json
import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = ROOT.parent
PUBLIC_ROOT = PROJECT_ROOT / "frontend" / "public" / "gen-sticker-docs"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def copy_file(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)
    if sha256(source) != sha256(destination):
        raise RuntimeError(f"Hash mismatch after copy: {destination}")


def main() -> None:
    payload = json.loads((ROOT / "project-docs.json").read_text(encoding="utf-8"))
    copy_file(ROOT / "project-docs.json", PUBLIC_ROOT / "project-docs.json")

    assets_source = ROOT / "assets"
    assets_destination = PUBLIC_ROOT / "assets"
    if assets_destination.exists():
        shutil.rmtree(assets_destination)
    shutil.copytree(assets_source, assets_destination)

    copied_office = 0
    for document in payload["documents"]:
        source = ROOT / "originals" / document["filename"]
        if not source.exists():
            continue
        destination = PUBLIC_ROOT / document["assetPath"]
        copy_file(source, destination)
        copied_office += 1

    print(
        f"Synced manifest, {len(payload['figures'])} figure pairs and "
        f"{copied_office}/{len(payload['documents'])} Office files to {PUBLIC_ROOT}"
    )


if __name__ == "__main__":
    main()
