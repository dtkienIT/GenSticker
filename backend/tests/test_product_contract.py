from __future__ import annotations

import asyncio

import pytest
from pydantic import ValidationError

from app.catalog import EXPRESSION_KEYS, get_catalog
from app.domain import StickerStyle, SubjectType
from app.mock_pipeline import MockStickerPipeline
from app.pipeline import (
    MIN_PUBLISHABLE_OUTPUTS,
    TARGET_OUTPUTS,
    InputAssessmentRequest,
    StickerPipelinePort,
    validate_publishable_ordinals,
)
from app.schemas import JobCreateRequest, StickerSetResponse


def test_every_subject_has_eight_versioned_catalog_slots() -> None:
    for subject in SubjectType:
        catalog = get_catalog(subject, "vi")
        assert tuple(item.expression_key for item in catalog) == EXPRESSION_KEYS
        assert len({item.pose_prompt for item in catalog}) == TARGET_OUTPUTS
        assert all(item.wording for item in catalog)


def test_publish_contract_accepts_six_to_eight_unique_ordinals() -> None:
    assert validate_publishable_ordinals([1, 2, 3, 4, 5, 8]) == (1, 2, 3, 4, 5, 8)
    assert len(validate_publishable_ordinals(range(1, 9))) == TARGET_OUTPUTS


@pytest.mark.parametrize("ordinals", ([1, 2, 3, 4, 5], [1, 2, 3, 4, 5, 5], range(2, 9)))
def test_publish_contract_rejects_invalid_sets(ordinals) -> None:
    with pytest.raises(ValueError):
        validate_publishable_ordinals(ordinals)


def test_job_contract_locks_style_locale_and_catalog() -> None:
    request = JobCreateRequest(
        source_image_id="source-1",
        style_id=StickerStyle.PLUSH,
        locale="en",
        catalog_version="v1",
    )
    assert request.style_id is StickerStyle.PLUSH
    assert request.locale == "en"


def test_set_contract_requires_six_to_eight_stickers() -> None:
    payload = {
        "id": "set-1",
        "job_id": "job-1",
        "style": "pixel",
        "subject_type": "pet",
        "locale": "vi",
        "catalog_version": "v1",
        "target_count": 8,
        "published_count": MIN_PUBLISHABLE_OUTPUTS,
        "rejected_count": 2,
        "status": "preview",
        "mocked": True,
        "created_at": "2026-08-13T00:00:00Z",
        "stickers": [
            {
                "id": f"s-{ordinal}",
                "ordinal": ordinal,
                "expression_key": EXPRESSION_KEYS[ordinal - 1],
                "mime_type": "image/png",
                "moderation_status": "passed",
                "asset_url": f"/assets/{ordinal}",
                "created_at": "2026-08-13T00:00:00Z",
            }
            for ordinal in range(1, 7)
        ],
    }
    assert StickerSetResponse.model_validate(payload).published_count == 6
    payload["stickers"] = payload["stickers"][:5]
    payload["published_count"] = 5
    with pytest.raises(ValidationError):
        StickerSetResponse.model_validate(payload)


def test_mock_implements_vendor_neutral_pipeline_port() -> None:
    pipeline = MockStickerPipeline(0)
    assert isinstance(pipeline, StickerPipelinePort)
    assessment = asyncio.run(pipeline.assess_input(InputAssessmentRequest("source-1", "image/png")))
    assert assessment.passed is True
    assert assessment.subject_type == "person"
    canonical = asyncio.run(pipeline.create_canonical({"style_id": "plush"}))
    sheet = asyncio.run(pipeline.generate_sheet({"canonical": canonical}))
    outputs = asyncio.run(pipeline.assess_outputs({"candidates": sheet["candidates"]}))
    assert len(outputs["published_ordinals"]) == 8
