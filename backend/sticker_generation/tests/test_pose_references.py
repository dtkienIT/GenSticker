from pathlib import Path

from PIL import Image

from sticker_generation.pose_references import extract_pose_references


def test_extract_pose_references_creates_twenty_square_crops(tmp_path: Path) -> None:
    sheet = tmp_path / "sheet.png"
    Image.new("RGB", (1250, 1250), "white").save(sheet)
    output = tmp_path / "poses"

    paths = extract_pose_references(sheet, output)

    assert len(paths) == 20
    assert all(path.is_file() for path in paths)
    assert all(Image.open(path).size == (512, 512) for path in paths)
