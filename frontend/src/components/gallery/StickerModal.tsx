import { useState } from 'react';
import type { FC } from 'react';
import type { StickerItem } from '../../types/sticker';
import { X, Download, Share2, Sparkles, Check } from 'lucide-react';
import { StickerService } from '../../services/stickerService';

interface StickerModalProps {
  sticker: StickerItem | null;
  onClose: () => void;
  onToggleFavorite?: (id: string) => void;
}

export const StickerModal: FC<StickerModalProps> = ({
  sticker,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!sticker) return null;

  const handleDownload = () => {
    StickerService.downloadSticker(sticker);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(sticker.imageUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      background: 'var(--modal-overlay)',
      backdropFilter: 'blur(12px)',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div 
        className="glass-panel" 
        style={{
          width: '100%',
          maxWidth: '560px',
          padding: '32px',
          position: 'relative',
          border: '1px solid rgba(139, 92, 246, 0.4)',
          boxShadow: 'var(--shadow-glow)'
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <X size={20} />
        </button>

        {/* Sticker Large Preview */}
        <div style={{
          background: 'radial-gradient(circle at center, rgba(139, 92, 246, 0.2) 0%, transparent 70%)',
          borderRadius: 'var(--radius-md)',
          padding: '32px 20px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <img 
            src={sticker.imageUrl} 
            alt={sticker.title} 
            className="sticker-effect"
            style={{ width: '180px', height: '180px', objectFit: 'contain' }}
          />
        </div>

        {/* Title & Metadata */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '99px', background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc', fontSize: '0.8rem', fontWeight: 600, marginBottom: '8px' }}>
            <Sparkles size={14} />
            <span>Phong cách: {sticker.styleName}</span>
          </div>

          <h3 style={{ fontSize: '1.6rem', fontWeight: 800 }}>{sticker.title}</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Cảm xúc: <strong>{sticker.emotion}</strong>
          </p>

          {/* Tags */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '12px', flexWrap: 'wrap' }}>
            {sticker.tags.map((tag, idx) => (
              <span key={idx} style={{
                fontSize: '0.75rem',
                padding: '4px 10px',
                borderRadius: '6px',
                background: 'var(--btn-secondary-bg)',
                color: 'var(--text-muted)'
              }}>
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* Technical Specs */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '12px',
          padding: '12px',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--input-bg)',
          border: '1px solid var(--border-subtle)',
          marginBottom: '28px',
          textAlign: 'center',
          fontSize: '0.8rem'
        }}>
          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block' }}>Định Dạng</span>
            <strong style={{ color: 'var(--text-primary)' }}>PNG Transparent</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block' }}>Kích Thước</span>
            <strong style={{ color: 'var(--text-primary)' }}>{sticker.dimensions}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)', display: 'block' }}>Dung Lượng</span>
            <strong style={{ color: 'var(--text-primary)' }}>{sticker.sizeKb} KB</strong>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={handleDownload}
            className="btn-primary"
            style={{ flex: 1, minWidth: '180px', justifyContent: 'center' }}
          >
            <Download size={18} />
            <span>Tải HD (1024x1024)</span>
          </button>

          <button
            onClick={handleCopyLink}
            className="btn-secondary"
            style={{ padding: '12px 18px' }}
            title="Sao chép Data Link"
          >
            {copied ? <Check size={18} color="#10b981" /> : <Share2 size={18} />}
          </button>
        </div>

      </div>
    </div>
  );
};
