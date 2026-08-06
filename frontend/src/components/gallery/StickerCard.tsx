import type { FC, MouseEvent } from 'react';
import type { StickerItem } from '../../types/sticker';
import { Download, Heart, Eye } from 'lucide-react';
import { StickerService } from '../../services/stickerService';

interface StickerCardProps {
  sticker: StickerItem;
  onInspect: (sticker: StickerItem) => void;
  onToggleFavorite: (id: string) => void;
}

export const StickerCard: FC<StickerCardProps> = ({
  sticker,
  onInspect,
  onToggleFavorite,
}) => {
  const handleDownload = (e: MouseEvent) => {
    e.stopPropagation();
    StickerService.downloadSticker(sticker);
  };

  const handleFavorite = (e: MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(sticker.id);
  };

  return (
    <div
      onClick={() => onInspect(sticker)}
      className="glass-card-interactive"
      style={{
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        background: 'var(--bg-card)',
        backdropFilter: 'blur(10px)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden'
      }}
    >
      {/* Top Favorite & Inspect overlay buttons */}
      <div style={{
        position: 'absolute',
        top: '12px',
        right: '12px',
        zIndex: 10,
        display: 'flex',
        gap: '6px'
      }}>
        <button
          onClick={handleFavorite}
          style={{
            background: 'var(--btn-secondary-bg)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: sticker.isFavorite ? '#ec4899' : 'var(--text-muted)',
            cursor: 'pointer',
            backdropFilter: 'blur(6px)',
            transition: 'all 0.2s ease'
          }}
          title="Yêu thích"
        >
          <Heart size={16} fill={sticker.isFavorite ? '#ec4899' : 'none'} />
        </button>
      </div>

      {/* Image Display */}
      <div style={{
        width: '100%',
        height: '140px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px',
        marginBottom: '12px'
      }}>
        <img 
          src={sticker.imageUrl} 
          alt={sticker.title} 
          className="sticker-effect"
          style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
        />
      </div>

      {/* Info & Title */}
      <div style={{ width: '100%', textAlign: 'center', marginTop: 'auto' }}>
        <h4 style={{
          fontSize: '0.92rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {sticker.title}
        </h4>

        <p style={{
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          marginTop: '2px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {sticker.emotion}
        </p>

        {/* Quick Action bar */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginTop: '12px',
          paddingTop: '10px',
          borderTop: '1px solid var(--border-subtle)'
        }}>
          <button
            onClick={() => onInspect(sticker)}
            className="btn-secondary"
            style={{ flex: 1, padding: '6px', fontSize: '0.78rem', justifyContent: 'center' }}
          >
            <Eye size={14} />
            <span>Xem</span>
          </button>

          <button
            onClick={handleDownload}
            className="btn-primary"
            style={{ flex: 1, padding: '6px', fontSize: '0.78rem', justifyContent: 'center' }}
          >
            <Download size={14} />
            <span>Tải HD</span>
          </button>
        </div>
      </div>

    </div>
  );
};
