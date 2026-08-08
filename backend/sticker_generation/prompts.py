from typing import Sequence

from sticker_generation.catalog import _COMMON_NEGATIVE
from sticker_generation.models import StickerTemplate


def build_canonical_prompt(style_prompt: str) -> str:
    return (
        "Create one polished sticker character from the identity reference. "
        "The identity reference is the source of truth: preserve the same face shape, same eyes, "
        "same nose and mouth proportions, same hairstyle, same hair color, same skin tone, and "
        "the same recognizable facial features. Do not replace her face with a generic cute face, "
        "enlarge the eyes excessively, or beautify away distinctive traits. Preserve visible "
        "facial asymmetry and the relationship between both eyes, nose, complete mouth, jawline, "
        "and hairstyle. Keep every facial feature intact, aligned, and naturally shaped. "
        "Use a consistent simple outfit and a centered "
        "head-and-shoulders composition. Apply this visual style: "
        f"{style_prompt}. When the requested style is 3D, use true volumetric 3D rendering with "
        "soft studio lighting rather than a flat cel-shaded drawing. Use polished sticker art, "
        "solid white background, one person only, no text, no logo, no watermark."
    )


def build_group_prompt(
    templates: Sequence[StickerTemplate],
    style_prompt: str,
) -> str:
    if len(templates) != 4:
        raise ValueError("group_prompt_requires_four_templates")
    positions = ("top-left", "top-right", "bottom-left", "bottom-right")
    cells = [
        f"{position}: {template.pose_prompt}; expression: {template.emotion_prompt}; "
        f"accents: {template.decorative_prompt}."
        for position, template in zip(positions, templates, strict=True)
    ]
    return (
        "Create exactly four separate finished character stickers in a strict 2 columns by "
        "2 rows grid, exactly one sticker per cell. Reference image 1 is the real person's "
        "identity and is the source of truth for face shape, eyes, eyebrows, nose, lips, skin "
        "tone, jawline, hairstyle, and accessories. Reference image 2 is the approved canonical "
        "and controls outfit, proportions, line work, and colors. Every cell must depict the "
        "same recognizable person, not a generic anime face. Keep facial geometry consistent "
        "across all four cells. Apply this style: "
        f"{style_prompt}. "
        + " ".join(cells)
        + " Use generous spacing, a plain light background, bold clean outlines, and a white "
        "die-cut border. No text, letters, numbers, watermark, logo, extra character, duplicate "
        "pose, overlap, photorealism, or decorative marks outside the stickers."
    )


def build_pack_sheet_prompt(
    templates: Sequence[StickerTemplate],
    style_prompt: str,
) -> str:
    if len(templates) != 20:
        raise ValueError("pack_sheet_prompt_requires_twenty_templates")
    cells = [
        f"row {index // 5 + 1} column {index % 5 + 1}: "
        f"{template.pose_prompt}; expression: {template.emotion_prompt}; "
        f"accents: {template.decorative_prompt}."
        for index, template in enumerate(templates)
    ]
    return (
        "Create exactly twenty separate finished character stickers in a strict 5 columns by "
        "4 rows grid, exactly one centered sticker in each cell, read left-to-right then "
        "top-to-bottom. Reference image 1 is the real person's identity and is the source of "
        "truth for facial geometry, skin tone, hairstyle, hair color, and accessories. "
        "Reference image 2 is the approved canonical and controls outfit, proportions, line "
        "work, and palette. Every cell must depict the same recognizable person. Keep all "
        "twenty cells equal in size with straight, evenly spaced boundaries and no overlap. "
        f"Apply this style consistently: {style_prompt}. "
        + " ".join(cells)
        + " Use a plain white background and generous empty spacing inside every cell. No text, "
        "letters, numbers, captions, watermark, logo, extra character, missing cell, duplicate "
        "pose, merged panel, photorealism, or decoration crossing a cell boundary."
    )


def build_eight_sheet_prompt(
    templates: Sequence[StickerTemplate],
    style_prompt: str,
    *,
    reserve_count: int = 0,
) -> str:
    if len(templates) + reserve_count != 8:
        raise ValueError("eight_sheet_prompt_requires_eight_cells")
    cells = [
        f"row {index // 4 + 1} column {index % 4 + 1}: "
        f"{template.pose_prompt}; expression: {template.emotion_prompt}; "
        f"accents: {template.decorative_prompt}."
        for index, template in enumerate(templates)
    ]
    reserve_descriptions = (
        "gentle neutral smile, hands relaxed and lowered",
        "small friendly wave with one complete visible hand",
        "calm closed-eye smile with hands away from the face",
        "simple thumbs-up with one complete visible hand",
    )
    cells.extend(
        f"row {index // 4 + 1} column {index % 4 + 1}: reserve filler; "
        f"{reserve_descriptions[index - len(templates)]}; minimal decorative accents."
        for index in range(len(templates), 8)
    )
    return (
        "Create exactly eight separate polished character stickers in a strict 4 columns by "
        "2 rows grid on a landscape canvas, exactly one centered sticker in each cell, read "
        "left-to-right then top-to-bottom. Reference image 1 is the real selfie and is the "
        "absolute source of truth for identity: preserve the recognizable face shape, eye and "
        "eyebrow relationship, nose, lips, jawline, skin tone, hairstyle, hair color, earrings, "
        "and visible outfit. Reference image 2 is the approved canonical and controls the fixed "
        "chibi rendering, proportions, line work, palette, and outfit consistency. Every cell "
        "must be the same person from the selfie. Reference image 3 is a non-art layout guide: "
        "copy only its count and placement of four positions across and exactly two rows down. "
        "Do not reproduce its placeholder shapes, borders, lines, or colors. Never create a "
        "third row, never create a fifth column or a 5 columns by 2 rows layout, and never crop a "
        "row at the canvas edge. Every sticker must fit completely inside one of the eight guide "
        "positions. Every cell "
        "must depict the same person from the selfie, never a generic replacement character. Keep "
        "all eight cells equal in size with wide transparent gutters and no artwork crossing a "
        f"cell boundary. Apply this style consistently: {style_prompt}. "
        + " ".join(cells)
        + " Each sticker must show one complete and anatomically coherent face with the jaw, "
        "chin, both eyes, nose, and lips intact and aligned. The mouth must remain clearly "
        "visible and naturally shaped; never omit, erase, duplicate, or warp facial features. "
        "Hands must be readable, naturally attached, and have the correct number of fingers, "
        "with no fused, missing, or extra fingers. Accessories and decorative accents must stay "
        "inside their own cell and must not cover the face. Each sticker is a centered "
        "head-and-upper-body die-cut character with a clean white outline and comfortable empty "
        "space around the silhouette. No text, letters, captions, watermark, logo, extra person, missing cell, "
        "duplicate pose, merged panel, photorealism, or decoration crossing a cell boundary."
    )


def build_sticker_prompt(template: StickerTemplate) -> str:
    return (
        "Create one finished cartoon sticker using three reference images with strict roles. "
        "Reference image 1 is the selfie and controls facial identity. Reference image 2 is "
        "the approved canonical character and controls the fixed hairstyle, outfit, line style, "
        "and proportions. Reference image 3 is the pose/composition template. Copy only the pose, "
        "gesture, prop, framing, and decorative idea from reference image 3; do not copy the face, "
        "hair, skin tone, or outfit from reference image 3. Preserve the identity from references "
        "1 and 2. Required pose: "
        f"{template.pose_prompt}. Required expression: {template.emotion_prompt}. "
        f"Decorative accents: {template.decorative_prompt}. "
        "Use bold smooth outlines, soft cel shading, one centered character, solid white background, "
        "and no text, no lettering, no logo, no watermark. "
        f"Avoid: {_COMMON_NEGATIVE}."
    )
