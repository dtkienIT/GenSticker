from fastapi import APIRouter, HTTPException, status
from app.models.schemas import TelegramExportRequest, TelegramExportResponse
from app.services.telegram_service import TelegramService

router = APIRouter(prefix="/telegram", tags=["Telegram Export"])

@router.post("/export", response_model=TelegramExportResponse)
def export_telegram_stickers(req: TelegramExportRequest):
  """
  Export generated sticker pack to Telegram.
  Generates Telegram sticker set link & QR code.
  """
  try:
    response = TelegramService.export_sticker_pack(req)
    return response
  except Exception as e:
    raise HTTPException(
      status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
      detail=f"Lỗi khi khởi tạo bộ sticker Telegram: {str(e)}"
    )
