import { useState } from 'react';
import type { FC } from 'react';
import type { StickerItem } from '../../types/sticker';
import { StickerService } from '../../services/stickerService';
import { 
  Send, 
  X, 
  Check, 
  Copy, 
  ExternalLink, 
  Sparkles, 
  Smartphone,
  Bot,
  Info
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface TelegramExportModalProps {
  stickers: StickerItem[];
  isOpen: boolean;
  onClose: () => void;
  styleName?: string;
}

const EMOJI_LIST = ['👍', '💖', '🧐', '🤬', '😴', '🤣', '😭', '😎', '💻', '🙏', '😱', '🥳', '☕', '🔥', '❓', '🏆', '✨', '🤦‍♂️', '🫰', '🎂'];

export const TelegramExportModal: FC<TelegramExportModalProps> = ({
  stickers,
  isOpen,
  onClose,
  styleName = '3D Chibi Cutie'
}) => {
  const [packTitle, setPackTitle] = useState(`GenSticker - ${styleName}`);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exportResult, setExportResult] = useState<{
    deeplink: string;
    webUrl: string;
    tmeUrl: string;
    qrCodeUrl: string;
    packName: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsLoading(true);
    try {
      // Convert all SVG sticker images to base64 PNG 512x512 via canvas
      const stickerImages: string[] = [];
      for (const stk of stickers) {
        try {
          const b64 = await convertImageToBase64PNG(stk.imageUrl, 512, 512);
          stickerImages.push(b64);
        } catch (e) {
          console.warn('Failed to convert sticker image:', e);
        }
      }

      const res = await StickerService.exportToTelegram({
        packTitle,
        styleName,
        stickerIds: stickers.map((s) => s.id),
        stickerImages: stickerImages,
      });

      // Build Telegram Web deep-link: opens bot directly in web.telegram.org
      const telegramWebUrl = `https://web.telegram.org/a/#?tgaddr=${encodeURIComponent(res.telegram_deeplink)}`;

      setExportResult({
        deeplink: res.telegram_deeplink,
        webUrl: telegramWebUrl,
        tmeUrl: res.pack_url,
        qrCodeUrl: res.qr_code_url,
        packName: res.pack_name,
      });

      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#229ED9', '#0088cc', '#7c3aed', '#ec4899']
      });
    } catch (err) {
      console.error('Failed to export telegram stickers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /** Converts an image URL (SVG data URI or regular URL) to base64 PNG */
  const convertImageToBase64PNG = (imageUrl: string, w: number, h: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('No canvas context');

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/png');
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = imageUrl;
    });
  };

  const handleCopyLink = () => {
    if (exportResult?.webUrl) {
      navigator.clipboard.writeText(exportResult.webUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="modal-overlay-backdrop">
      <div 
        className="glass-panel responsive-modal-card"
        style={{
          width: '100%',
          maxWidth: '640px',
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: '24px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-card)',
          position: 'relative',
          padding: '0'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '22px 28px',
          background: 'linear-gradient(135deg, rgba(34, 158, 217, 0.15) 0%, rgba(99, 102, 241, 0.12) 100%)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #229ED9 0%, #0088cc 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(34, 158, 217, 0.4)',
              flexShrink: 0
            }}>
              <Send size={24} color="white" style={{ marginLeft: '-2px' }} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Thêm Trực Tiếp Vào Telegram
              </h3>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: '3px 0 0' }}>
                Xuất 1-Click bộ {stickers.length} sticker cảm xúc vào ứng dụng Telegram
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'var(--btn-secondary-bg)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Content */}
        <div style={{ padding: '24px 28px' }}>
          
          {/* Title input */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Tên Bộ Sticker (Sticker Pack Title)
            </label>
            <input 
              type="text"
              value={packTitle}
              onChange={(e) => setPackTitle(e.target.value)}
              placeholder="Nhập tên bộ sticker..."
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '12px',
                background: 'var(--input-bg)',
                border: '1px solid var(--input-border)',
                color: 'var(--input-text)',
                fontSize: '0.95rem',
                outline: 'none',
                transition: 'all 0.2s ease'
              }}
            />
          </div>

          {/* Sticker Thumbnail Grid */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Danh sách {stickers.length} Sticker kèm Emoji tự động:
              </span>
              <span style={{ fontSize: '0.76rem', color: '#0284c7', fontWeight: 700 }}>
                1024×1024 ➔ Auto 512×512 WEBP/PNG
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(54px, 1fr))',
              gap: '8px',
              maxHeight: '160px',
              overflowY: 'auto',
              padding: '12px',
              borderRadius: '14px',
              background: 'var(--btn-secondary-bg)',
              border: '1px solid var(--border-subtle)'
            }}>
              {stickers.map((stk, idx) => (
                <div 
                  key={stk.id}
                  style={{
                    position: 'relative',
                    aspectRatio: '1',
                    borderRadius: '10px',
                    background: 'var(--bg-card)',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid var(--border-subtle)',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)'
                  }}
                  title={`${stk.title} (${EMOJI_LIST[idx % EMOJI_LIST.length]})`}
                >
                  <img src={stk.imageUrl} alt={stk.title} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  <span style={{
                    position: 'absolute',
                    bottom: '-2px',
                    right: '-2px',
                    fontSize: '0.75rem',
                    background: 'rgba(15, 23, 42, 0.85)',
                    color: 'white',
                    borderRadius: '50%',
                    padding: '1px 3px'
                  }}>
                    {EMOJI_LIST[idx % EMOJI_LIST.length]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Result display area */}
          {exportResult ? (
            <div style={{
              padding: '20px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(34, 158, 217, 0.1) 0%, rgba(99, 102, 241, 0.1) 100%)',
              border: '1px solid rgba(34, 158, 217, 0.35)',
              animation: 'fadeIn 0.3s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0284c7', marginBottom: '12px' }}>
                <Sparkles size={20} />
                <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>Đã Tạo Liên Kết Thêm 1-Click Telegram! 🎉</strong>
              </div>

              {/* Instructions */}
              <div style={{
                padding: '14px 16px',
                borderRadius: '12px',
                background: 'var(--badge-purple-bg)',
                border: '1px solid var(--badge-purple-border)',
                color: 'var(--text-primary)',
                fontSize: '0.84rem',
                marginBottom: '18px',
                lineHeight: '1.5'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <Smartphone size={16} color="var(--accent-purple)" />
                  <strong>📱 Trên Điện Thoại:</strong>
                </div>
                <div style={{ marginLeft: '22px', marginBottom: '8px' }}>
                  Quét QR Code bên dưới bằng Camera → Bấm <strong>START</strong> trong Telegram → Đợi Bot tạo sticker → Bấm <strong>ADD STICKERS</strong>!
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <Info size={16} color="var(--accent-purple)" />
                  <strong>💻 Trên Máy Tính:</strong>
                </div>
                <div style={{ marginLeft: '22px' }}>
                  Cần cài <strong>Telegram Desktop</strong> để nút "Mở Telegram" hoạt động. Hoặc sao chép link và gửi cho mình trên Telegram.
                </div>
              </div>

              {/* QR Code - Prominent */}
              <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{
                  padding: '12px',
                  background: 'white',
                  borderRadius: '16px',
                  border: '1px solid var(--border-subtle)',
                  boxShadow: 'var(--shadow-card)',
                  textAlign: 'center'
                }}>
                  <img 
                    src={exportResult.qrCodeUrl} 
                    alt="Telegram QR Code" 
                    style={{ width: '140px', height: '140px', display: 'block', borderRadius: '8px' }}
                  />
                  <span style={{ fontSize: '0.75rem', color: '#0f172a', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '6px' }}>
                    <Smartphone size={12} /> Quét bằng Camera 📱
                  </span>
                </div>

                {/* Actions */}
                <div style={{ flex: 1, minWidth: '220px' }}>
                  {/* Open in Telegram button */}
                  <a
                    href={exportResult.webUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary"
                    style={{
                      width: '100%',
                      padding: '13px',
                      marginBottom: '10px',
                      background: 'linear-gradient(135deg, #229ED9 0%, #0088cc 100%)',
                      justifyContent: 'center',
                      textDecoration: 'none',
                      boxShadow: '0 4px 20px rgba(34, 158, 217, 0.45)',
                      borderRadius: '12px',
                      fontSize: '0.92rem'
                    }}
                  >
                    <Bot size={18} />
                    <span>Mở Telegram & Bấm START</span>
                    <ExternalLink size={14} />
                  </a>

                  {/* Copy link */}
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="text" 
                      readOnly 
                      value={exportResult.webUrl}
                      style={{
                        width: '100%',
                        padding: '10px 38px 10px 12px',
                        borderRadius: '10px',
                        background: 'var(--input-bg)',
                        border: '1px solid var(--input-border)',
                        color: 'var(--accent-purple)',
                        fontSize: '0.8rem',
                        fontFamily: 'monospace'
                      }}
                    />
                    <button
                      onClick={handleCopyLink}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: copied ? '#10b981' : 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: '4px'
                      }}
                      title="Sao chép đường dẫn"
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px', textAlign: 'center' }}>
                    💡 Sao chép link rồi mở trong Telegram cũng được!
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={handleExport}
              disabled={isLoading || !packTitle.trim()}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '1rem',
                background: 'linear-gradient(135deg, #229ED9 0%, #0088cc 100%)',
                justifyContent: 'center',
                borderRadius: '14px',
                boxShadow: '0 6px 24px rgba(34, 158, 217, 0.35)',
                opacity: isLoading ? 0.7 : 1
              }}
            >
              {isLoading ? (
                <span>Đang khởi tạo Telegram Deep-Link...</span>
              ) : (
                <>
                  <Send size={20} />
                  <span>Tạo & Thêm Bộ Sticker Về Telegram Ngay</span>
                </>
              )}
            </button>
          )}

        </div>

      </div>
    </div>
  );
};
