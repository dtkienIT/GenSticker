import re
import uuid
import urllib.parse
from typing import List, Dict, Any
from app.config import settings
from app.models.schemas import TelegramExportRequest, TelegramExportResponse
from app.services.telegram_bot import TelegramBot, EMOJI_LIST as BOT_EMOJI_LIST

STICKER_EMOJI_MAP = {
  "stk_01": "👍", "stk_02": "💖", "stk_03": "🧐", "stk_04": "🤬",
  "stk_05": "😴", "stk_06": "🤣", "stk_07": "😭", "stk_08": "😎",
  "stk_09": "💻", "stk_10": "🙏", "stk_11": "😱", "stk_12": "🥳",
  "stk_13": "☕", "stk_14": "🔥", "stk_15": "❓", "stk_16": "🏆",
  "stk_17": "✨", "stk_18": "🤦‍♂️", "stk_19": "🫰", "stk_20": "🎂"
}

STICKER_TITLES = [
  "Siêu Hảo Hạng", "Thả Tim Ngập Tràn", "Đang Suy Nghĩ", "Cực Kỳ Phẫn Nộ",
  "Ngủ Ngon Lành", "Cười Bể Bụng", "Khóc Nổi Sông", "Ngầu Như Bồn Cầu",
  "Chăm Chỉ Cày Code", "Xin Lỗi Được Chưa", "Hoảng Hốt Sợ Hãi", "Quẩy Tiệc Đêm",
  "Nạp Năng Lượng Cà Phê", "Dâng Trào Quyết Tâm", "Đơ Người Không Hiểu",
  "Ăn Mừng Chiến Thắng", "Bay Bổng Mộng Mơ", "Bất Lực Toàn Tập",
  "Thả Tim Bằng Tay", "Chúc Mừng Sinh Nhật"
]

class TelegramService:
  @staticmethod
  def sanitize_pack_name(title: str, bot_username: str) -> str:
    """
    Telegram Sticker Set names must:
    - Begin with a letter
    - Contain only english letters, digits and underscores
    - End with '_by_<bot_username>'
    - Be 1-64 characters long
    """
    clean_title = re.sub(r'[^a-zA-Z0-9]', '_', title.lower())
    clean_title = re.sub(r'_+', '_', clean_title).strip('_')
    if not clean_title or not clean_title[0].isalpha():
      clean_title = "gs_" + clean_title
    
    unique_suffix = uuid.uuid4().hex[:6]
    clean_bot = re.sub(r'[^a-zA-Z0-9_]', '', bot_username or "gen_sticker_2026_bot")
    
    raw_name = f"{clean_title}_{unique_suffix}_by_{clean_bot}"
    if len(raw_name) > 64:
      overhead = len(f"_{unique_suffix}_by_{clean_bot}")
      clean_title = clean_title[:(64 - overhead)]
      raw_name = f"{clean_title}_{unique_suffix}_by_{clean_bot}"
    
    return raw_name

  @staticmethod
  def export_sticker_pack(req: TelegramExportRequest) -> TelegramExportResponse:
    bot_username = settings.TELEGRAM_BOT_USERNAME or "gen_sticker_2026_bot"
    pack_name = req.pack_name or TelegramService.sanitize_pack_name(req.pack_title, bot_username)
    
    if not pack_name.endswith(f"_by_{bot_username}"):
      pack_name = f"{pack_name}_by_{bot_username}"

    # Use short ID for deep link (Telegram limits start param to 64 chars)
    short_id = uuid.uuid4().hex[:12]
    pack_id = f"pack_{short_id}"

    # Store pack data for the bot to pick up when user clicks START
    TelegramBot.store_pending_pack(pack_id, {
      "pack_name": pack_name,
      "pack_title": req.pack_title,
      "sticker_ids": req.sticker_ids or [f"stk_{i+1:02d}" for i in range(20)],
      "sticker_titles": STICKER_TITLES,
      "sticker_images": req.sticker_images or [],  # base64 PNG data from frontend
      "style_name": req.style_name,
    })

    # Generate bot deep link (user will open this in Telegram)
    bot_url = f"https://t.me/{bot_username}?start={pack_id}"
    telegram_deeplink = f"tg://resolve?domain={bot_username}&start={pack_id}"
    
    # QR code for the bot link
    encoded_url = urllib.parse.quote(bot_url)
    qr_code_url = f"https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=10&color=0b0f19&bgcolor=ffffff&data={encoded_url}"

    total_count = len(req.sticker_ids) if req.sticker_ids else 20

    return TelegramExportResponse(
      success=True,
      pack_title=req.pack_title,
      pack_name=pack_name,
      pack_url=bot_url,
      telegram_deeplink=telegram_deeplink,
      qr_code_url=qr_code_url,
      total_stickers=total_count,
      message=f"Bộ sticker '{req.pack_title}' đã sẵn sàng! Bấm START trên Telegram để Bot tự động tạo cho bạn."
    )
