import { useState, useMemo } from 'react';
import type { FC } from 'react';
import type { StickerItem, GenerationState } from '../../types/sticker';
import { StickerCard } from './StickerCard';
import { StickerModal } from './StickerModal';
import { TelegramExportModal } from './TelegramExportModal';
import { DownloadCloud, Search, Sparkles, Filter, RefreshCw, Send } from 'lucide-react';
import { StickerService } from '../../services/stickerService';

interface StickerGridProps {
  state: GenerationState;
  onReset: () => void;
  onToggleFavorite: (id: string) => void;
}

export const StickerGrid: FC<StickerGridProps> = ({
  state,
  onReset,
  onToggleFavorite,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [inspectedSticker, setInspectedSticker] = useState<StickerItem | null>(null);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);

  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    state.stickers.forEach((s) => s.tags.forEach((t) => tagsSet.add(t)));
    return ['all', ...Array.from(tagsSet)];
  }, [state.stickers]);

  const filteredStickers = useMemo(() => {
    return state.stickers.filter((sticker) => {
      const matchesSearch = 
        sticker.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sticker.emotion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sticker.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesTag = selectedTag === 'all' || sticker.tags.includes(selectedTag);

      return matchesSearch && matchesTag;
    });
  }, [state.stickers, searchTerm, selectedTag]);

  const handleDownloadAll = () => {
    StickerService.downloadAllStickers(state.stickers);
  };

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
      
      {/* Top Banner & Batch Actions */}
      <div className="glass-panel" style={{ padding: '32px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
          
          {/* Header left */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {state.originalImage && (
              <div style={{
                width: '72px',
                height: '72px',
                borderRadius: '16px',
                overflow: 'hidden',
                border: '2px solid var(--accent-purple)',
                boxShadow: 'var(--shadow-glow)',
                flexShrink: 0
              }}>
                <img 
                  src={state.originalImage} 
                  alt="Original avatar" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            )}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }} className="text-gradient">
                  Bộ 20 Sticker Hoàn Tất! 🎉
                </h2>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Phong cách: <strong>{state.stickers[0]?.styleName}</strong> • Định dạng PNG Transparent HD
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={onReset}
              className="btn-secondary"
            >
              <RefreshCw size={16} />
              <span>Tạo Bộ Mới</span>
            </button>

            <button
              onClick={() => setIsTelegramModalOpen(true)}
              className="btn-primary"
              style={{
                background: 'linear-gradient(135deg, #229ED9 0%, #0088cc 100%)',
                boxShadow: '0 4px 20px rgba(34, 158, 217, 0.4)'
              }}
            >
              <Send size={18} />
              <span>Thêm Vào Telegram</span>
            </button>

            <button
              onClick={handleDownloadAll}
              className="btn-secondary"
            >
              <DownloadCloud size={18} />
              <span>Tải Tất Cả 20 Sticker</span>
            </button>
          </div>

        </div>

        {/* Search & Tag Filter Bar */}
        <div style={{
          marginTop: '28px',
          paddingTop: '20px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          
          {/* Search Input */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
            <Search 
              size={18} 
              color="var(--text-muted)" 
              style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input 
              type="text" 
              placeholder="Tìm kiếm biểu cảm, từ khóa..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px 10px 42px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--input-bg)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '0.88rem',
                outline: 'none',
                transition: 'all 0.2s ease'
              }}
            />
          </div>

          {/* Tags Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '4px', maxWidth: '100%' }}>
            <Filter size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
            {allTags.map((tag) => {
              const isSelected = selectedTag === tag;
              return (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: isSelected ? 700 : 500,
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-full)',
                    background: isSelected ? 'var(--accent-purple)' : 'var(--btn-secondary-bg)',
                    color: isSelected ? 'white' : 'var(--text-secondary)',
                    border: '1px solid',
                    borderColor: isSelected ? 'var(--accent-purple)' : 'var(--border-subtle)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {tag === 'all' ? 'Tất cả' : `#${tag}`}
                </button>
              );
            })}
          </div>

        </div>

      </div>

      {/* Grid of 20 Sticker Cards */}
      {filteredStickers.length > 0 ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '18px'
        }}>
          {filteredStickers.map((sticker) => (
            <StickerCard 
              key={sticker.id}
              sticker={sticker}
              onInspect={(st) => setInspectedSticker(st)}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '48px', textAlign: 'center' }}>
          <Sparkles size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
          <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Không tìm thấy sticker nào phù hợp</h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Thử nhập từ khóa khác hoặc xóa bộ lọc.
          </p>
        </div>
      )}

      {/* High-res Inspector Modal */}
      <StickerModal 
        sticker={inspectedSticker}
        onClose={() => setInspectedSticker(null)}
        onToggleFavorite={onToggleFavorite}
      />

      {/* Telegram Export Modal */}
      <TelegramExportModal
        stickers={state.stickers}
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
        styleName={state.stickers[0]?.styleName}
      />

    </div>
  );
};

