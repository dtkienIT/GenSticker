from __future__ import annotations

from sticker_generation.models import StickerTemplate


_COMMON_NEGATIVE = (
    "text, lettering, logo, watermark, extra person, duplicate character, collage, "
    "photorealistic, changed hairstyle, changed hair color, changed outfit, "
    "deformed hands, extra fingers, missing fingers, malformed face"
)


def _template(
    order: int,
    template_id: str,
    label: str,
    pose: str,
    emotion: str,
    decorative: str,
) -> StickerTemplate:
    return StickerTemplate(
        template_id=template_id,
        display_order=order,
        label=label,
        pose_prompt=pose,
        emotion_prompt=emotion,
        decorative_prompt=decorative,
        negative_prompt=_COMMON_NEGATIVE,
        reference_filename=f"{order:02d}_{template_id}.png",
    )


DEFAULT_STICKER_CATALOG: tuple[StickerTemplate, ...] = (
    _template(1, "hello", "Xin chào!", "open-hand wave beside the shoulder", "friendly smile", "yellow motion lines and small hearts"),
    _template(2, "thanks", "Cảm ơn nhé!", "both hands forming a heart in front of the chest", "grateful smile", "pink hearts"),
    _template(3, "ok", "OK luôn!", "one hand making a clear OK gesture", "confident smile", "yellow sparkle"),
    _template(4, "haha", "Haha", "one hand raised loosely while laughing", "closed-eye joyful laugh", "black laugh marks"),
    _template(5, "sad", "Buồn quá...", "one cheek resting in one hand", "sad downturned mouth", "blue scribble and vertical sadness lines"),
    _template(6, "great", "Tuyệt vời!", "both hands giving thumbs up", "bright happy smile", "yellow stars"),
    _template(7, "full", "No quá rồi!", "one hand on the stomach after eating, relaxed seated pose", "content but overfull expression", "small white puff"),
    _template(8, "busy_laptop", "Đang bận!", "typing on an open laptop in front of the body", "focused downward gaze", "small yellow attention lines"),
    _template(9, "tired", "Mệt quá...", "head and cheek supported by one hand, slumped shoulders", "exhausted closed eyes", "black swirl and gray fatigue lines"),
    _template(10, "sleep", "Chúc ngủ ngon!", "hugging a pillow while sleeping with a sleep mask", "peaceful sleeping face", "crescent moon and stars"),
    _template(11, "cheer", "Cố lên nhé!", "one fist raised beside the shoulder", "determined encouraging smile", "yellow sparkles"),
    _template(12, "thumbs_up", "Thumbs up!", "one large thumbs-up gesture toward the viewer", "winking confident smile", "yellow motion lines"),
    _template(13, "love", "Yêu bạn!", "both hands forming a heart in front of the chest", "warm affectionate smile", "three pink hearts"),
    _template(14, "sorry", "Xin lỗi nhé!", "palms pressed together in an apologetic gesture", "worried teary face", "blue sweat drops"),
    _template(15, "wow", "Wow!", "both hands touching the cheeks", "wide eyes and open mouth surprise", "red burst and small heart"),
    _template(16, "hahaha", "Hahaha", "head tilted back with both shoulders lifted", "open-mouth laughing joyfully", "red laugh marks"),
    _template(17, "fine", "Tôi ổn mà!", "one hand making an OK gesture beside the face", "relaxed reassuring smile", "yellow sparkle"),
    _template(18, "go", "Đi thôi!", "one arm extended, pointing forward", "energetic inviting smile", "blue speed lines"),
    _template(19, "goodbye", "Tạm biệt nhé!", "open-hand goodbye wave", "gentle smile", "pink heart"),
    _template(20, "see_you", "Hẹn gặp lại!", "both arms raised overhead forming a large heart", "happy smile", "three pink hearts"),
)

PROBE_TEMPLATE_IDS = ("hello", "busy_laptop", "wow", "see_you")
