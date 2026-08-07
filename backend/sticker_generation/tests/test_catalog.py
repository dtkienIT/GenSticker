from sticker_generation.catalog import DEFAULT_STICKER_CATALOG, PROBE_TEMPLATE_IDS


def test_catalog_contains_twenty_unique_target_templates() -> None:
    assert len(DEFAULT_STICKER_CATALOG) == 20
    assert len({item.template_id for item in DEFAULT_STICKER_CATALOG}) == 20
    assert len({item.display_order for item in DEFAULT_STICKER_CATALOG}) == 20
    assert [item.display_order for item in DEFAULT_STICKER_CATALOG] == list(range(1, 21))


def test_catalog_covers_hard_pose_and_prop_cases() -> None:
    combined = " ".join(item.pose_prompt for item in DEFAULT_STICKER_CATALOG).lower()
    for required in ("laptop", "pillow", "thumbs up", "pointing", "heart"):
        assert required in combined


def test_probe_set_uses_identity_and_hand_stress_cases() -> None:
    assert PROBE_TEMPLATE_IDS == ("hello", "busy_laptop", "wow", "see_you")
