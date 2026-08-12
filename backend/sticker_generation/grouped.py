from __future__ import annotations

import asyncio
from collections.abc import Callable, Sequence
from io import BytesIO
from itertools import pairwise
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

from sticker_generation.catalog import DEFAULT_STICKER_CATALOG
from sticker_generation.identity import sanitize_reference_image
from sticker_generation.models import ImageGenerationRequest, ImageGenerationResult, StickerTemplate
from sticker_generation.postprocess import postprocess_sticker, remove_border_background
from sticker_generation.prompts import build_canonical_prompt, build_eight_sheet_prompt
from sticker_generation.providers.base import ImageProvider

ProgressCallback = Callable[[str, int, int], None]
SheetCallback = Callable[[bytes], None]

SHEET_NEGATIVE_PROMPT = (
    "malformed face, distorted face, asymmetrical misplaced eyes, missing eye, missing mouth, "
    "erased lips, warped mouth, detached hand, fused fingers, extra fingers, missing fingers, "
    "broken wrist, cropped head, cropped chin, cropped hands, duplicate character, overlapping "
    "cells, decoration crossing cell boundary, extra row, third row, extra column, fifth column, "
    "5 by 2 grid, ten stickers, twelve stickers"
)

# A wrong column count can create multiple separate crossings that the
# decorative-accent heuristic intentionally ignores. A score this high is
# never a safe gutter.
SEVERE_TRANSPARENT_CUT_SCORE = 0.45
TRANSIENT_PROVIDER_ERRORS = {
    "openai_provider_unavailable",
    "openai_rate_limit",
    "openai_timeout",
}


class GroupedStickerGenerator:
    """Generate 20 stickers with one canonical and three strict 4x2 sheets."""

    def __init__(
        self,
        *,
        provider: ImageProvider,
        canvas_size: int = 512,
        max_provider_attempts: int = 1,
        retry_base_delay_seconds: float = 0,
        sheet_concurrency: int = 1,
    ) -> None:
        self.provider = provider
        self.canvas_size = canvas_size
        self.max_provider_attempts = max(1, max_provider_attempts)
        self.retry_base_delay_seconds = max(0, retry_base_delay_seconds)
        self.sheet_concurrency = max(1, min(3, sheet_concurrency))

    async def _generate_with_retry(
        self,
        request: ImageGenerationRequest,
    ) -> ImageGenerationResult:
        for attempt in range(self.max_provider_attempts):
            try:
                return await self.provider.generate(request)
            except RuntimeError as error:
                is_transient = str(error) in TRANSIENT_PROVIDER_ERRORS
                if not is_transient or attempt + 1 >= self.max_provider_attempts:
                    raise
                delay = self.retry_base_delay_seconds * (2**attempt)
                if delay:
                    await asyncio.sleep(delay)
        raise RuntimeError("provider_retry_exhausted")

    async def generate(
        self,
        *,
        selfie_path: Path,
        output_dir: Path,
        style_prompt: str,
        templates: Sequence[StickerTemplate] = DEFAULT_STICKER_CATALOG,
        on_progress: ProgressCallback | None = None,
        on_sheet: SheetCallback | None = None,
    ) -> tuple[Path, ...]:
        template_tuple = tuple(templates)
        if len(template_tuple) != 20:
            raise ValueError("grouped_generation_requires_20_templates")
        output_dir.mkdir(parents=True, exist_ok=True)
        sanitized_selfie = sanitize_reference_image(
            selfie_path,
            output_dir / "inputs" / "selfie.png",
        )
        self._notify(on_progress, "identity", 1, 1)

        canonical_result = await self._generate_with_retry(
            ImageGenerationRequest(
                prompt=build_canonical_prompt(style_prompt),
                reference_images=(sanitized_selfie,),
                metadata={"stage": "canonical"},
            )
        )
        try:
            with Image.open(BytesIO(canonical_result.image_bytes)) as canonical:
                canonical.verify()
        except (OSError, ValueError) as error:
            raise ValueError("canonical_invalid_image") from error
        canonical_path = output_dir / "canonical.png"
        canonical_path.write_bytes(canonical_result.image_bytes)
        layout_guide_path = output_dir / "four-by-two-layout-guide.png"
        self._create_four_by_two_layout_guide(layout_guide_path)
        self._notify(on_progress, "canonical", 1, 1)

        return await self._generate_sheets(
            output_dir=output_dir,
            style_prompt=style_prompt,
            templates=template_tuple,
            on_progress=on_progress,
            on_sheet=on_sheet,
        )

    async def resume(
        self,
        *,
        output_dir: Path,
        style_prompt: str,
        templates: Sequence[StickerTemplate] = DEFAULT_STICKER_CATALOG,
        on_progress: ProgressCallback | None = None,
        on_sheet: SheetCallback | None = None,
    ) -> tuple[Path, ...]:
        template_tuple = tuple(templates)
        if len(template_tuple) != 20:
            raise ValueError("grouped_generation_requires_20_templates")
        required = (
            output_dir / "inputs" / "selfie.png",
            output_dir / "canonical.png",
            output_dir / "four-by-two-layout-guide.png",
        )
        if not all(path.is_file() for path in required):
            raise ValueError("grouped_resume_artifacts_missing")
        return await self._generate_sheets(
            output_dir=output_dir,
            style_prompt=style_prompt,
            templates=template_tuple,
            on_progress=on_progress,
            on_sheet=on_sheet,
        )

    async def _generate_sheets(
        self,
        *,
        output_dir: Path,
        style_prompt: str,
        templates: tuple[StickerTemplate, ...],
        on_progress: ProgressCallback | None,
        on_sheet: SheetCallback | None,
    ) -> tuple[Path, ...]:
        sanitized_selfie = output_dir / "inputs" / "selfie.png"
        canonical_path = output_dir / "canonical.png"
        layout_guide_path = output_dir / "four-by-two-layout-guide.png"

        sticker_dir = output_dir / "stickers"
        sticker_dir.mkdir(parents=True, exist_ok=True)
        sheet_plan = ((0, 8), (8, 8), (16, 4))
        completed_sheets = 0

        async def generate_sheet(
            sheet_index: int,
            start: int,
            keep_count: int,
        ) -> None:
            nonlocal completed_sheets
            sheet_templates = templates[start : start + keep_count]
            sheet_paths = tuple(
                sticker_dir / template.reference_filename
                for template in sheet_templates
            )
            if all(path.is_file() for path in sheet_paths):
                completed_sheets += 1
                self._notify(on_progress, "groups", completed_sheets, 3)
                return

            async with semaphore:
                raw_path = output_dir / f"raw-sheet-{sheet_index}.png"
                raw_bytes, sheet_cells = self._read_valid_raw_sheet(raw_path)
                reused_raw_sheet = raw_bytes is not None and sheet_cells is not None
                if raw_bytes is None or sheet_cells is None:
                    result = await self._generate_with_retry(
                        ImageGenerationRequest(
                            prompt=build_eight_sheet_prompt(
                                sheet_templates,
                                style_prompt,
                                reserve_count=8 - keep_count,
                            ),
                            reference_images=(
                                sanitized_selfie,
                                canonical_path,
                                layout_guide_path,
                            ),
                            negative_prompt=SHEET_NEGATIVE_PROMPT,
                            size="1536x1024",
                            metadata={
                                "stage": "pack_sheet",
                                "sheet_index": sheet_index,
                                "first_order": start + 1,
                                "last_order": start + keep_count,
                                "keep_count": keep_count,
                            },
                        )
                    )
                    raw_bytes = result.image_bytes
                    try:
                        with Image.open(BytesIO(raw_bytes)) as raw_sheet:
                            raw_sheet.verify()
                    except (OSError, ValueError) as error:
                        raise ValueError("pack_sheet_invalid_image") from error
                    raw_path.write_bytes(raw_bytes)
                    if on_sheet:
                        on_sheet(raw_bytes)
                    sheet_cells = self._split_eight_sheet(raw_bytes)
                if reused_raw_sheet and on_sheet:
                    on_sheet(raw_bytes)
                for template, sticker_bytes in zip(
                    sheet_templates,
                    sheet_cells[:keep_count],
                    strict=True,
                ):
                    path = sticker_dir / template.reference_filename
                    path.write_bytes(
                        postprocess_sticker(sticker_bytes, canvas_size=self.canvas_size)
                    )
            completed_sheets += 1
            self._notify(on_progress, "groups", completed_sheets, 3)

        semaphore = asyncio.Semaphore(self.sheet_concurrency)
        if self.sheet_concurrency == 1:
            for sheet_index, (start, keep_count) in enumerate(sheet_plan, start=1):
                await generate_sheet(sheet_index, start, keep_count)
        else:
            tasks = [
                asyncio.create_task(generate_sheet(sheet_index, start, keep_count))
                for sheet_index, (start, keep_count) in enumerate(sheet_plan, start=1)
            ]
            try:
                await asyncio.gather(*tasks)
            except BaseException:
                for task in tasks:
                    task.cancel()
                await asyncio.gather(*tasks, return_exceptions=True)
                raise
        output_paths = tuple(
            sticker_dir / template.reference_filename for template in templates
        )
        if not all(path.is_file() for path in output_paths):
            raise RuntimeError("incomplete_sticker_pack")
        return output_paths

    @staticmethod
    def _read_valid_raw_sheet(
        path: Path,
    ) -> tuple[bytes | None, tuple[bytes, ...] | None]:
        if not path.is_file():
            return None, None
        raw_bytes = path.read_bytes()
        try:
            return raw_bytes, GroupedStickerGenerator._split_eight_sheet(raw_bytes)
        except (OSError, ValueError):
            return None, None

    @staticmethod
    def _create_four_by_two_layout_guide(path: Path) -> None:
        width, height = 1536, 1024
        columns, rows = 4, 2
        image = Image.new("RGB", (width, height), "white")
        draw = ImageDraw.Draw(image)
        for row in range(rows):
            for column in range(columns):
                left = column * width // columns
                top = row * height // rows
                right = (column + 1) * width // columns
                bottom = (row + 1) * height // rows
                margin_x = (right - left) // 8
                margin_y = (bottom - top) // 10
                draw.rounded_rectangle(
                    (left + 6, top + 6, right - 6, bottom - 6),
                    radius=18,
                    outline=(220, 225, 230),
                    width=4,
                )
                center_x = (left + right) // 2
                head_radius = min(right - left, bottom - top) // 5
                head_center_y = top + margin_y + head_radius
                draw.ellipse(
                    (
                        center_x - head_radius,
                        head_center_y - head_radius,
                        center_x + head_radius,
                        head_center_y + head_radius,
                    ),
                    fill=(205, 213, 222),
                )
                draw.rounded_rectangle(
                    (
                        left + margin_x,
                        head_center_y + head_radius,
                        right - margin_x,
                        bottom - margin_y,
                    ),
                    radius=48,
                    fill=(225, 230, 235),
                )
        image.save(path, format="PNG", optimize=True)

    @staticmethod
    def _split_eight_sheet(image_bytes: bytes) -> tuple[bytes, ...]:
        sheet = Image.open(BytesIO(image_bytes)).convert("RGBA")
        width, height = sheet.size
        if width < 1000 or height < 600:
            raise ValueError("pack_sheet_too_small")
        transparent_background = GroupedStickerGenerator._transparent_ratio(sheet) > 0.05
        foreground = GroupedStickerGenerator._foreground_mask(sheet)
        (
            cut_score,
            minimum_occupancy,
            column_edges,
            row_edges,
        ) = GroupedStickerGenerator._adaptive_grid_quality(
            foreground,
            4,
            2,
        )
        transparent_cut_rejected = transparent_background and (
            cut_score >= SEVERE_TRANSPARENT_CUT_SCORE
            or (
                cut_score > 0.10
                and GroupedStickerGenerator._has_dominant_gutter_crossing(
                    foreground,
                    column_edges,
                    row_edges,
                )
            )
        )
        opaque_cut_rejected = not transparent_background and cut_score > 0.18
        recovered_checkerboard = False
        if opaque_cut_rejected:
            cleaned_sheet = remove_border_background(
                sheet.copy(),
                tolerance=24,
                multi_color=True,
            )
            if GroupedStickerGenerator._transparent_ratio(cleaned_sheet) > 0.15:
                sheet = cleaned_sheet
                transparent_background = True
                foreground = GroupedStickerGenerator._foreground_mask(sheet)
                (
                    cut_score,
                    minimum_occupancy,
                    column_edges,
                    row_edges,
                ) = GroupedStickerGenerator._adaptive_grid_quality(
                    foreground,
                    4,
                    2,
                )
                transparent_cut_rejected = cut_score > 0.10 and (
                    cut_score >= SEVERE_TRANSPARENT_CUT_SCORE
                    or GroupedStickerGenerator._has_dominant_gutter_crossing(
                        foreground,
                        column_edges,
                        row_edges,
                    )
                )
                opaque_cut_rejected = False
                recovered_checkerboard = (
                    cut_score < SEVERE_TRANSPARENT_CUT_SCORE
                    and minimum_occupancy >= 0.35
                )
        dense_square_four_by_two = (
            transparent_background
            and 0.85 <= width / height <= 1.15
            and 0.35 <= minimum_occupancy
            and cut_score < SEVERE_TRANSPARENT_CUT_SCORE
        )
        if (
            (
                transparent_cut_rejected
                and not (dense_square_four_by_two or recovered_checkerboard)
            )
            or opaque_cut_rejected
            or minimum_occupancy < 0.03
        ):
            raise ValueError("pack_sheet_grid_not_detected")
        outputs: list[bytes] = []
        for row in range(2):
            for column in range(4):
                box = (
                    column_edges[column],
                    row_edges[row],
                    column_edges[column + 1],
                    row_edges[row + 1],
                )
                buffer = BytesIO()
                sheet.crop(box).save(buffer, format="PNG", optimize=True)
                outputs.append(buffer.getvalue())
        return tuple(outputs)

    @staticmethod
    def _has_dominant_gutter_crossing(
        foreground: Image.Image,
        column_edges: tuple[int, ...],
        row_edges: tuple[int, ...],
    ) -> bool:
        def longest_run(values: tuple[bool, ...]) -> int:
            longest = 0
            current = 0
            for has_foreground in values:
                current = current + 1 if has_foreground else 0
                longest = max(longest, current)
            return longest

        width, height = foreground.size
        band = max(2, min(width, height) // 256)
        strips = (
            *(
                (foreground.crop((edge - band, 0, edge + band, height)), "vertical")
                for edge in column_edges[1:-1]
            ),
            *(
                (foreground.crop((0, edge - band, width, edge + band)), "horizontal")
                for edge in row_edges[1:-1]
            ),
        )
        for strip, axis in strips:
            projection = (
                tuple(strip.crop((0, y, strip.width, y + 1)).getbbox() is not None for y in range(strip.height))
                if axis == "vertical"
                else tuple(strip.crop((x, 0, x + 1, strip.height)).getbbox() is not None for x in range(strip.width))
            )
            occupied = sum(projection)
            if occupied == 0:
                continue
            longest = longest_run(projection)
            segment_edges = row_edges if axis == "vertical" else column_edges
            crossed_segments = sum(
                longest_run(projection[start:end]) / max(1, end - start) >= 0.12
                for start, end in pairwise(segment_edges)
            )
            # A wrong row/column count often cuts one subject in several cells,
            # producing multiple long runs without one run dominating the total.
            if crossed_segments >= 2:
                return True
            if longest / len(projection) >= 0.12 and longest / occupied >= 0.80:
                return True
        return False

    @staticmethod
    def _adaptive_grid_quality(
        foreground: Image.Image,
        columns: int,
        rows: int,
    ) -> tuple[float, float, tuple[int, ...], tuple[int, ...]]:
        column_edges, column_scores = GroupedStickerGenerator._find_gutters(
            foreground,
            divisions=columns,
            axis="vertical",
        )
        row_edges, row_scores = GroupedStickerGenerator._find_gutters(
            foreground,
            divisions=rows,
            axis="horizontal",
        )
        occupancies: list[float] = []
        for row in range(rows):
            for column in range(columns):
                cell = foreground.crop(
                    (
                        column_edges[column],
                        row_edges[row],
                        column_edges[column + 1],
                        row_edges[row + 1],
                    )
                )
                occupancies.append(
                    sum(cell.tobytes()) / (255 * cell.width * cell.height)
                )
        return (
            max((*column_scores, *row_scores), default=0.0),
            min(occupancies),
            column_edges,
            row_edges,
        )

    @staticmethod
    def _find_gutters(
        foreground: Image.Image,
        *,
        divisions: int,
        axis: str,
    ) -> tuple[tuple[int, ...], tuple[float, ...]]:
        width, height = foreground.size
        length = width if axis == "vertical" else height
        band = max(2, min(width, height) // 256)
        # Image models can shift an otherwise valid gutter more than two
        # percent from the mathematical cell boundary. Four percent still
        # keeps adjacent search windows disjoint and cannot reach a 3x2 gutter.
        cell_span = length // divisions
        search_radius = max(
            band + 1,
            min(length // 25, cell_span // 4),
        )
        edges = [0]
        scores: list[float] = []
        for division in range(1, divisions):
            ideal = division * length // divisions
            candidates: list[tuple[float, int, int]] = []
            for position in range(ideal - search_radius, ideal + search_radius + 1):
                if axis == "vertical":
                    strip = foreground.crop(
                        (position - band, 0, position + band, height)
                    )
                else:
                    strip = foreground.crop(
                        (0, position - band, width, position + band)
                    )
                score = sum(strip.tobytes()) / (
                    255 * strip.width * strip.height
                )
                candidates.append((score, abs(position - ideal), position))
            score, _, position = min(candidates)
            edges.append(position)
            scores.append(score)
        edges.append(length)
        return tuple(edges), tuple(scores)

    @staticmethod
    def _split_pack_sheet(image_bytes: bytes) -> tuple[bytes, ...]:
        sheet = Image.open(BytesIO(image_bytes)).convert("RGBA")
        width, height = sheet.size
        if width < 500 or height < 400:
            raise ValueError("pack_sheet_too_small")
        foreground = GroupedStickerGenerator._foreground_mask(sheet)
        candidates = tuple(
            (
                GroupedStickerGenerator._grid_quality(foreground, columns, rows),
                columns,
                rows,
            )
            for columns, rows in ((5, 4), (4, 5))
        )
        (cut_score, minimum_occupancy), columns, rows = min(
            candidates,
            key=lambda candidate: (candidate[0][0], -candidate[0][1]),
        )
        if cut_score > 0.18 or minimum_occupancy < 0.03:
            raise ValueError("pack_sheet_grid_not_detected")
        boxes = tuple(
            (
                column * width // columns,
                row * height // rows,
                (column + 1) * width // columns,
                (row + 1) * height // rows,
            )
            for row in range(rows)
            for column in range(columns)
        )
        outputs: list[bytes] = []
        for box in boxes:
            buffer = BytesIO()
            sheet.crop(box).save(buffer, format="PNG", optimize=True)
            outputs.append(buffer.getvalue())
        return tuple(outputs)

    @staticmethod
    def _foreground_mask(sheet: Image.Image) -> Image.Image:
        alpha = sheet.getchannel("A")
        transparent_ratio = GroupedStickerGenerator._transparent_ratio(sheet)
        if transparent_ratio > 0.05:
            return alpha.point(lambda value: 255 if value > 16 else 0)

        rgb = sheet.convert("RGB")
        radius = max(8, min(sheet.size) // 80)
        smooth_background = rgb.filter(ImageFilter.GaussianBlur(radius=radius))
        local_difference = ImageChops.difference(rgb, smooth_background).convert("L")
        return local_difference.point(lambda value: 255 if value > 12 else 0)

    @staticmethod
    def _transparent_ratio(sheet: Image.Image) -> float:
        alpha_histogram = sheet.getchannel("A").histogram()
        return sum(alpha_histogram[:250]) / (sheet.width * sheet.height)

    @staticmethod
    def _grid_quality(
        foreground: Image.Image,
        columns: int,
        rows: int,
    ) -> tuple[float, float]:
        width, height = foreground.size
        band = max(2, min(width, height) // 256)
        boundary_samples: list[float] = []
        for column in range(1, columns):
            center = column * width // columns
            strip = foreground.crop((center - band, 0, center + band, height))
            boundary_samples.append(
                sum(strip.tobytes()) / (255 * strip.width * strip.height)
            )
        for row in range(1, rows):
            center = row * height // rows
            strip = foreground.crop((0, center - band, width, center + band))
            boundary_samples.append(
                sum(strip.tobytes()) / (255 * strip.width * strip.height)
            )

        occupancies = []
        for row in range(rows):
            for column in range(columns):
                cell = foreground.crop(
                    (
                        column * width // columns,
                        row * height // rows,
                        (column + 1) * width // columns,
                        (row + 1) * height // rows,
                    )
                )
                occupancies.append(
                    sum(cell.tobytes()) / (255 * cell.width * cell.height)
                )
        return max(boundary_samples, default=0.0), min(occupancies)

    @staticmethod
    def _notify(
        callback: ProgressCallback | None,
        stage: str,
        current: int,
        total: int,
    ) -> None:
        if callback:
            callback(stage, current, total)
