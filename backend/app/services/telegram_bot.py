"""
Telegram Bot Service - Real sticker pack creation via Telegram Bot API.

Flow:
1. User clicks "Export to Telegram" on web → backend saves pack data to JSON file
2. Frontend redirects user to t.me/bot?start=PACK_ID
3. User opens Telegram, clicks START
4. Bot receives /start command with pack_id, gets user_id
5. Bot creates sticker set using uploadStickerFile + createNewStickerSet API
6. Bot sends confirmation message with "Add Stickers" button
"""
import asyncio
import base64
import io
import json
import os
import logging
import tempfile
import threading
from typing import Optional
from PIL import Image, ImageDraw, ImageFont
import httpx

from app.config import settings

logger = logging.getLogger("telegram_bot")

# File-based store for pending packs (survives uvicorn reload)
DATA_DIR = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "data"))
PENDING_PACKS_FILE = os.path.join(DATA_DIR, "pending_telegram_packs.json")
LAST_UPDATE_ID_FILE = os.path.join(DATA_DIR, "telegram_last_update_id.txt")
_PENDING_PACKS_LOCK = threading.Lock()

EMOJI_LIST = ['👍', '💖', '🧐', '🤬', '😴', '🤣', '😭', '😎', '💻', '🙏',
              '😱', '🥳', '☕', '🔥', '❓', '🏆', '✨', '🤦\u200d♂️', '🫰', '🎂']

STICKER_COLORS = [
    (124, 58, 237), (236, 72, 153), (6, 182, 212), (239, 68, 68),
    (59, 130, 246), (245, 158, 11), (99, 102, 241), (16, 185, 129),
    (139, 92, 246), (244, 63, 94), (168, 85, 247), (6, 182, 212),
    (217, 119, 6), (220, 38, 38), (100, 116, 139), (16, 185, 129),
    (244, 114, 182), (249, 115, 22), (236, 72, 153), (139, 92, 246)
]


def _load_last_update_id() -> int:
    """Load last processed update_id from disk."""
    try:
        if os.path.exists(LAST_UPDATE_ID_FILE):
            with open(LAST_UPDATE_ID_FILE, "r") as f:
                return int(f.read().strip())
    except Exception:
        pass
    return 0


def _save_last_update_id(update_id: int):
    """Persist last processed update_id to disk."""
    try:
        os.makedirs(os.path.dirname(LAST_UPDATE_ID_FILE), exist_ok=True)
        with open(LAST_UPDATE_ID_FILE, "w") as f:
            f.write(str(update_id))
    except Exception as e:
        logger.warning(f"Failed to save last_update_id: {e}")


def _load_pending_packs() -> dict:
    """Load pending packs from JSON file."""
    try:
        os.makedirs(os.path.dirname(PENDING_PACKS_FILE), exist_ok=True)
        if os.path.exists(PENDING_PACKS_FILE):
            with open(PENDING_PACKS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception as e:
        logger.warning(f"Failed to load pending packs: {e}")
    return {}


def _save_pending_packs(data: dict):
    """Atomically save pending packs so readers never observe partial JSON."""
    temp_path = None
    try:
        os.makedirs(os.path.dirname(PENDING_PACKS_FILE), exist_ok=True)
        fd, temp_path = tempfile.mkstemp(
            prefix="pending_telegram_packs_",
            suffix=".tmp",
            dir=os.path.dirname(PENDING_PACKS_FILE),
        )
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        os.replace(temp_path, PENDING_PACKS_FILE)
        temp_path = None
    except Exception as e:
        logger.error(f"Failed to save pending packs: {e}")
    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass


def _claim_pending_pack(pack_id: str) -> Optional[dict]:
    """Atomically remove and return one pending pack."""
    with _PENDING_PACKS_LOCK:
        all_packs = _load_pending_packs()
        pack_data = all_packs.pop(pack_id, None)
        if pack_data:
            _save_pending_packs(all_packs)
        return pack_data


def generate_sticker_png(index: int, emoji: str, title: str) -> bytes:
    """Generate a 512x512 PNG sticker image."""
    size = 512
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    color = STICKER_COLORS[index % len(STICKER_COLORS)]

    # Draw circle background
    padding = 20
    draw.ellipse([padding, padding, size - padding, size - padding], fill=(*color, 240))
    
    # Inner highlight
    inner = 50
    lighter = tuple(min(c + 50, 255) for c in color)
    draw.ellipse([inner, inner, size - inner, size - inner], fill=(*lighter, 180))

    # Draw emoji
    try:
        font_large = ImageFont.truetype("C:/Windows/Fonts/seguiemj.ttf", 140)
    except (OSError, IOError):
        try:
            font_large = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 140)
        except (OSError, IOError):
            font_large = ImageFont.load_default()

    bbox = draw.textbbox((0, 0), emoji, font=font_large)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((size - tw) / 2, (size - th) / 2 - 20), emoji, font=font_large, fill="white")

    # Draw title at bottom
    try:
        font_small = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 26)
    except (OSError, IOError):
        font_small = ImageFont.load_default()
    bbox2 = draw.textbbox((0, 0), title, font=font_small)
    tw2 = bbox2[2] - bbox2[0]
    draw.text(((size - tw2) / 2, size - 85), title, font=font_small, fill="white")

    # White border
    draw.ellipse([padding, padding, size - padding, size - padding],
                 outline=(255, 255, 255, 200), width=6)

    buf = io.BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    return buf.getvalue()


class TelegramBot:
    """Manages Telegram Bot polling and sticker set creation."""

    _instance = None
    _polling_task: Optional[asyncio.Task] = None
    _last_update_id: int = 0
    _processing_packs: set = set()  # Dedup guard for concurrent requests
    _processing_users: set[int] = set()  # Only one sticker-set job per Telegram user

    @classmethod
    def get_instance(cls) -> 'TelegramBot':
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        self.token = settings.TELEGRAM_BOT_TOKEN
        self.bot_username = settings.TELEGRAM_BOT_USERNAME
        self.base_url = f"https://api.telegram.org/bot{self.token}"
        # Restore last update_id from disk to avoid re-processing on reload
        TelegramBot._last_update_id = _load_last_update_id()

    async def start_polling(self):
        """Start long-polling for Telegram updates."""
        if not self.token:
            logger.warning("TELEGRAM_BOT_TOKEN not configured, bot polling disabled")
            return

        logger.info(f"🤖 Telegram Bot polling started for @{self.bot_username} (offset={self._last_update_id})")

        while True:
            try:
                async with httpx.AsyncClient(timeout=35) as client:
                    resp = await client.get(
                        f"{self.base_url}/getUpdates",
                        params={
                            "offset": self._last_update_id + 1,
                            "timeout": 25,
                            "allowed_updates": '["message"]'
                        }
                    )
                    data = resp.json()

                if data.get("ok") and data.get("result"):
                    for update in data["result"]:
                        self._last_update_id = update["update_id"]
                        _save_last_update_id(self._last_update_id)
                        asyncio.create_task(self._handle_update(update))

            except httpx.TimeoutException:
                continue
            except Exception as e:
                logger.error(f"Polling error: {e}")
                await asyncio.sleep(3)

    async def _handle_update(self, update: dict):
        """Handle incoming Telegram update."""
        message = update.get("message", {})
        text = message.get("text", "")
        chat_id = message.get("chat", {}).get("id")
        user_id = message.get("from", {}).get("id")
        first_name = message.get("from", {}).get("first_name", "User")

        if not text or not chat_id:
            return

        if text.startswith("/start"):
            parts = text.split(" ", 1)
            if len(parts) > 1 and parts[1].startswith("pack_"):
                pack_id = parts[1]
                await self._create_sticker_set_for_user(chat_id, user_id, first_name, pack_id)
            else:
                await self._send_welcome(chat_id, first_name)

    async def _send_welcome(self, chat_id: int, first_name: str):
        """Send welcome message."""
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(f"{self.base_url}/sendMessage", json={
                "chat_id": chat_id,
                "text": (
                    f"👋 Xin chào {first_name}!\n\n"
                    f"🎨 Tôi là Bot tạo Sticker của GenSticker AI.\n\n"
                    f"Hãy truy cập website GenSticker để tạo bộ sticker, "
                    f"sau đó bấm nút 'Thêm Vào Telegram' để tôi tự động "
                    f"tạo bộ sticker cho bạn!"
                ),
                "parse_mode": "HTML"
            })

    async def _upload_sticker_file(self, user_id: int, png_data: bytes) -> Optional[str]:
        """Upload a sticker file to Telegram and return file_id."""
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self.base_url}/uploadStickerFile",
                data={
                    "user_id": str(user_id),
                    "sticker_format": "static",
                },
                files={
                    "sticker": ("sticker.png", png_data, "image/png"),
                }
            )
            result = resp.json()
            if result.get("ok"):
                return result["result"]["file_id"]
            else:
                logger.error(f"uploadStickerFile failed: {result.get('description')}")
                return None

    async def _create_sticker_set_for_user(self, chat_id: int, user_id: int, first_name: str, pack_id: str):
        """Create a real sticker set on Telegram for the user."""
        # Telegram can reject concurrent sticker-set mutations from the same user.
        # Reject rapid duplicate starts before consuming the pending pack so the
        # active job can finish cleanly and no second job is lost mid-flight.
        if pack_id in TelegramBot._processing_packs or user_id in TelegramBot._processing_users:
            logger.warning(f"⚠️ User {user_id} already has a sticker pack being processed")
            await self._send_already_processing_notice(chat_id, first_name)
            return

        TelegramBot._processing_packs.add(pack_id)
        TelegramBot._processing_users.add(user_id)

        try:
            # Atomically claim the pack only after concurrency guards pass.
            pack_data = _claim_pending_pack(pack_id)

            if not pack_data:
                async with httpx.AsyncClient(timeout=10) as client:
                    await client.post(f"{self.base_url}/sendMessage", json={
                        "chat_id": chat_id,
                        "text": (
                            f"⏳ Xin lỗi {first_name}, bộ sticker này không còn tồn tại hoặc đã hết hạn.\n\n"
                            f"Vui lòng quay lại website GenSticker và bấm lại nút 'Thêm Vào Telegram'."
                        )
                    })
                return

            pack_name = pack_data["pack_name"]
            pack_title = pack_data["pack_title"]
            sticker_titles = pack_data.get("sticker_titles", [])
            sticker_images = pack_data.get("sticker_images", [])
            total = min(len(sticker_titles), 20) if sticker_titles else 20
            has_real_images = len(sticker_images) > 0

            # Send initial progress message (we'll update it)
            first_title = sticker_titles[0] if sticker_titles else "Sticker 1"
            async with httpx.AsyncClient(timeout=10) as client:
                msg_resp = await client.post(f"{self.base_url}/sendMessage", json={
                    "chat_id": chat_id,
                    "text": self._build_progress_text(pack_title, 0, total, 1, first_title, 10, "Đang xử lý ảnh..."),
                    "parse_mode": "HTML"
                })
                msg_data = msg_resp.json()
                progress_msg_id = msg_data.get("result", {}).get("message_id")

            # Step 1: Upload first sticker file
            if has_real_images and len(sticker_images) > 0:
                first_png = self._decode_base64_image(sticker_images[0])
            else:
                first_png = generate_sticker_png(0, EMOJI_LIST[0], first_title)
            first_file_id = await self._upload_sticker_file(user_id, first_png)

            if not first_file_id:
                raise Exception("Không thể upload file sticker đầu tiên lên Telegram")

            # Update progress: Sticker 1 at 60% (Uploaded)
            await self._update_progress(chat_id, progress_msg_id, pack_title, 0, total, 1, first_title, 60, "Đang tạo sticker set...")

            # Step 2: Create sticker set with first sticker
            stickers_json = json.dumps([{
                "sticker": first_file_id,
                "emoji_list": [EMOJI_LIST[0]],
                "format": "static"
            }])

            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    f"{self.base_url}/createNewStickerSet",
                    data={
                        "user_id": str(user_id),
                        "name": pack_name,
                        "title": pack_title,
                        "stickers": stickers_json,
                    }
                )
                result = resp.json()

            if not result.get("ok"):
                error_desc = result.get("description", "Unknown error")
                logger.error(f"createNewStickerSet failed: {error_desc}")

                if "SHORTNAME_OCCUPY_FAILED" in error_desc or "STICKER_SET_NAME_OCCUPIED" in error_desc or "already taken" in error_desc.lower():
                    pack_url = f"https://t.me/addstickers/{pack_name}"
                    async with httpx.AsyncClient(timeout=10) as client:
                        await client.post(f"{self.base_url}/sendMessage", json={
                            "chat_id": chat_id,
                            "text": "✅ Bộ sticker đã tồn tại rồi!\n\nBấm bên dưới để thêm vào Telegram:",
                            "reply_markup": {
                                "inline_keyboard": [[{
                                    "text": "📦 Thêm Sticker Set",
                                    "url": pack_url
                                }]]
                            }
                        })
                    return

                raise Exception(f"Telegram API error: {error_desc}")

            # Sticker 1 complete -> overall 1/total
            await self._update_progress(chat_id, progress_msg_id, pack_title, 1, total, 1, first_title, 100, "Đã xong!")

            # Step 3: Add remaining stickers one by one
            for i in range(1, total):
                emoji = EMOJI_LIST[i % len(EMOJI_LIST)]
                title = sticker_titles[i] if i < len(sticker_titles) else f"Sticker {i + 1}"

                # Update progress: Starting Sticker i+1
                await self._update_progress(chat_id, progress_msg_id, pack_title, i, total, i + 1, title, 30, "Đang xử lý...")

                if has_real_images and i < len(sticker_images):
                    png_data = self._decode_base64_image(sticker_images[i])
                else:
                    png_data = generate_sticker_png(i, emoji, title)

                file_id = await self._upload_sticker_file(user_id, png_data)
                if not file_id:
                    logger.warning(f"Failed to upload sticker {i}, skipping")
                    continue

                sticker_json = json.dumps({
                    "sticker": file_id,
                    "emoji_list": [emoji],
                    "format": "static"
                })

                async with httpx.AsyncClient(timeout=30) as client:
                    add_resp = await client.post(
                        f"{self.base_url}/addStickerToSet",
                        data={
                            "user_id": str(user_id),
                            "name": pack_name,
                            "sticker": sticker_json,
                        }
                    )
                    add_result = add_resp.json()
                    if not add_result.get("ok"):
                        logger.warning(f"addStickerToSet {i} failed: {add_result.get('description')}")

                # Update progress: Sticker i+1 complete
                await self._update_progress(chat_id, progress_msg_id, pack_title, i + 1, total, i + 1, title, 100, "Đã hoàn tất!")

                await asyncio.sleep(0.3)

            # Success!
            pack_url = f"https://t.me/addstickers/{pack_name}"
            async with httpx.AsyncClient(timeout=10) as client:
                await client.post(f"{self.base_url}/sendMessage", json={
                    "chat_id": chat_id,
                    "text": (
                        f"🎉 Tuyệt vời, {first_name}!\n\n"
                        f"Bộ sticker <b>\"{pack_title}\"</b> đã được tạo thành công "
                        f"với {total} sticker cảm xúc!\n\n"
                        f"Bấm nút bên dưới để thêm vào Telegram của bạn:"
                    ),
                    "parse_mode": "HTML",
                    "reply_markup": {
                        "inline_keyboard": [[{
                            "text": "📦 ADD STICKERS - Thêm Ngay!",
                            "url": pack_url
                        }]]
                    }
                })

            logger.info(f"✅ Created sticker set '{pack_name}' for user {user_id}")

        except Exception as e:
            logger.error(f"Error creating sticker set: {e}")
            async with httpx.AsyncClient(timeout=10) as client:
                await client.post(f"{self.base_url}/sendMessage", json={
                    "chat_id": chat_id,
                    "text": f"❌ Đã xảy ra lỗi khi tạo bộ sticker.\n\n{str(e)}\n\nVui lòng thử lại."
                })

        finally:
            TelegramBot._processing_packs.discard(pack_id)
            TelegramBot._processing_users.discard(user_id)

    async def _send_already_processing_notice(self, chat_id: int, first_name: str):
        """Tell a user to wait instead of starting overlapping Telegram jobs."""
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                await client.post(f"{self.base_url}/sendMessage", json={
                    "chat_id": chat_id,
                    "text": (
                        f"⏳ {first_name}, bot đang tạo một bộ sticker cho bạn.\n\n"
                        f"Vui lòng chờ thông báo hoàn tất rồi quay lại GenSticker để xuất bộ tiếp theo. "
                        f"Bạn không cần bấm START liên tục."
                    )
                })
        except Exception as e:
            logger.warning(f"Failed to send already-processing notice: {e}")

    @staticmethod
    def _build_progress_text(
        pack_title: str,
        current: int,
        total: int,
        current_sticker_num: int = 0,
        current_sticker_title: str = "",
        sticker_pct: int = 0,
        status_text: str = ""
    ) -> str:
        """Build HTML formatted text with two visual progress bars (overall + current sticker)."""
        overall_pct = int((current / total) * 100) if total > 0 else 0
        overall_filled = int((current / total) * 10) if total > 0 else 0
        overall_bar = "█" * overall_filled + "░" * (10 - overall_filled)

        lines = [
            f"⏳ <b>Đang tạo bộ sticker \"{pack_title}\"...</b>\n",
            "📊 <b>Tiến độ tổng thể:</b>",
            f"[<code>{overall_bar}</code>] {overall_pct}% ({current}/{total} sticker)",
        ]

        if current_sticker_num > 0 and current < total:
            sticker_filled = int((sticker_pct / 100) * 10)
            sticker_bar = "█" * sticker_filled + "░" * (10 - sticker_filled)
            title_str = f" \"{current_sticker_title}\"" if current_sticker_title else ""
            status_str = f" • <i>{status_text}</i>" if status_text else ""
            lines.extend([
                f"\n🖼 <b>Sticker {current_sticker_num}/{total}{title_str}:</b>",
                f"[<code>{sticker_bar}</code>] {sticker_pct}%{status_str}"
            ])

        lines.append("\n⚡ Vui lòng đợi trong giây lát...")
        return "\n".join(lines)

    async def _update_progress(
        self,
        chat_id: int,
        message_id: Optional[int],
        pack_title: str,
        current: int,
        total: int,
        current_sticker_num: int = 0,
        current_sticker_title: str = "",
        sticker_pct: int = 0,
        status_text: str = ""
    ):
        """Update progress message in Telegram using editMessageText."""
        if not message_id:
            return
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                await client.post(
                    f"{self.base_url}/editMessageText",
                    json={
                        "chat_id": chat_id,
                        "message_id": message_id,
                        "text": self._build_progress_text(
                            pack_title, current, total,
                            current_sticker_num, current_sticker_title,
                            sticker_pct, status_text
                        ),
                        "parse_mode": "HTML"
                    }
                )
        except Exception as e:
            logger.warning(f"Failed to update progress message: {e}")

    @staticmethod
    def _decode_base64_image(b64_str: str) -> bytes:
        """Decode base64 image string to PNG bytes, resizing to 512x512."""
        # Strip data URI prefix if present
        if ',' in b64_str:
            b64_str = b64_str.split(',', 1)[1]
        raw = base64.b64decode(b64_str)
        img = Image.open(io.BytesIO(raw)).convert('RGBA')
        img = img.resize((512, 512), Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        buf.seek(0)
        return buf.getvalue()

    @classmethod
    def store_pending_pack(cls, pack_id: str, pack_data: dict):
        """Store a pending pack to file for persistence across reloads."""
        with _PENDING_PACKS_LOCK:
            all_packs = _load_pending_packs()
            all_packs[pack_id] = pack_data
            _save_pending_packs(all_packs)
        logger.info(f"📦 Stored pending pack: {pack_id}")

    @classmethod
    async def ensure_polling_started(cls):
        """Start polling if not already running."""
        bot = cls.get_instance()
        if cls._polling_task is None or cls._polling_task.done():
            cls._polling_task = asyncio.create_task(bot.start_polling())
