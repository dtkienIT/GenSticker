from sticker_generation.catalog import DEFAULT_STICKER_CATALOG
import pytest

from sticker_generation.prompts import (
    build_canonical_prompt,
    build_pack_sheet_prompt,
    build_eight_sheet_prompt,
    build_sticker_prompt,
)


def test_canonical_prompt_prioritizes_identity_and_fixed_profile() -> None:
    prompt = build_canonical_prompt(style_prompt="polished soft 3D chibi")

    assert "identity reference" in prompt.lower()
    assert "same face shape" in prompt.lower()
    assert "same hairstyle" in prompt.lower()
    assert "3d rendering" in prompt.lower()
    assert "complete mouth" in prompt.lower()
    assert "solid white background" in prompt.lower()
    assert "no text" in prompt.lower()


def test_sticker_prompt_assigns_reference_roles_and_forbids_copying_pose_identity() -> None:
    prompt = build_sticker_prompt(DEFAULT_STICKER_CATALOG[0])
    lowered = prompt.lower()

    assert "reference image 1" in lowered
    assert "reference image 2" in lowered
    assert "reference image 3" in lowered
    assert "copy only the pose" in lowered
    assert "do not copy the face" in lowered
    assert "no text" in lowered


def test_pack_sheet_prompt_maps_all_twenty_templates_to_fixed_cells() -> None:
    prompt = build_pack_sheet_prompt(DEFAULT_STICKER_CATALOG, "clean cartoon")

    assert "5 columns by 4 rows" in prompt
    assert "row 1 column 1" in prompt
    assert "row 4 column 5" in prompt
    for index, template in enumerate(DEFAULT_STICKER_CATALOG):
        expected_mapping = (
            f"row {index // 5 + 1} column {index % 5 + 1}: "
            f"{template.pose_prompt}; expression: {template.emotion_prompt}; "
            f"accents: {template.decorative_prompt}."
        )
        assert expected_mapping in prompt


def test_pack_sheet_prompt_requires_exactly_twenty_templates() -> None:
    with pytest.raises(ValueError, match="pack_sheet_prompt_requires_twenty_templates"):
        build_pack_sheet_prompt(DEFAULT_STICKER_CATALOG[:-1], "clean cartoon")


def test_eight_sheet_prompt_maps_exactly_eight_templates() -> None:
    templates = DEFAULT_STICKER_CATALOG[:8]
    prompt = build_eight_sheet_prompt(templates, "polished 3D chibi")

    assert "exactly eight" in prompt.lower()
    assert "4 columns by 2 rows" in prompt
    assert "complete and anatomically coherent face" in prompt.lower()
    assert "mouth must remain clearly visible" in prompt.lower()
    assert "correct number of fingers" in prompt.lower()
    assert "accessories and decorative accents must stay inside" in prompt.lower()
    assert "reference image 3" in prompt.lower()
    assert "exactly two rows" in prompt.lower()
    for index, template in enumerate(templates):
        assert (
            f"row {index // 4 + 1} column {index % 4 + 1}: "
            f"{template.pose_prompt}; expression: {template.emotion_prompt}; "
            f"accents: {template.decorative_prompt}."
        ) in prompt


def test_eight_sheet_prompt_fills_four_reserved_cells_after_final_templates() -> None:
    prompt = build_eight_sheet_prompt(
        DEFAULT_STICKER_CATALOG[16:], "clean cartoon", reserve_count=4
    )

    assert "row 1 column 4" in prompt
    assert "row 2 column 1: reserve filler" in prompt.lower()
    assert "row 2 column 4: reserve filler" in prompt.lower()


@pytest.mark.parametrize("template_count,reserve_count", ((7, 0), (4, 3), (8, 1)))
def test_eight_sheet_prompt_rejects_non_eight_cell_plan(
    template_count: int, reserve_count: int
) -> None:
    with pytest.raises(ValueError, match="eight_sheet_prompt_requires_eight_cells"):
        build_eight_sheet_prompt(
            DEFAULT_STICKER_CATALOG[:template_count],
            "clean cartoon",
            reserve_count=reserve_count,
        )
