from io import BytesIO

from PIL import Image

from sticker_generation.pipeline import technical_quality_gate


def test_technical_quality_gate_rejects_opaque_canvas() -> None:
    image = Image.new("RGBA", (64, 64), (255, 255, 255, 255))
    buffer = BytesIO()
    image.save(buffer, format="PNG")

    accepted, reason = technical_quality_gate(buffer.getvalue(), canvas_size=64)

    assert not accepted
    assert reason == "opaque_background"
