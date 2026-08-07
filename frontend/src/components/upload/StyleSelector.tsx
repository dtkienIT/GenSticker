import type { FC } from 'react';
import type { StickerStyleId } from '../../types/sticker';
import { STICKER_STYLES } from '../../mock/mockStickers';
import { Check, Sparkles } from 'lucide-react';

interface StyleSelectorProps {
  selectedStyle: StickerStyleId;
  onSelectStyle: (styleId: StickerStyleId) => void;
  disabled?: boolean;
}

export const StyleSelector: FC<StyleSelectorProps> = ({
  selectedStyle,
  onSelectStyle,
  disabled = false,
}) => {
  return (
    <div style={{ marginTop: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={18} color="#c084fc" />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Chọn Phong Cách Sticker (Sticker Style)</h3>
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>8 Phong Cách Độc Đáo</span>
      </div>

      <div className="responsive-style-grid">
        {STICKER_STYLES.map((style) => {
          const isSelected = style.id === selectedStyle;
          return (
            <div
              key={style.id}
              onClick={() => !disabled && onSelectStyle(style.id)}
              className="glass-card-interactive"
              style={{
                padding: '14px',
                borderColor: isSelected ? 'var(--accent-purple)' : 'var(--border-subtle)',
                background: isSelected ? 'rgba(139, 92, 246, 0.15)' : 'var(--bg-card)',
                boxShadow: isSelected ? 'var(--shadow-glow)' : 'none',
                opacity: disabled ? 0.6 : 1,
                cursor: disabled ? 'not-allowed' : 'pointer',
                position: 'relative'
              }}
            >
              {/* Selected Check Mark */}
              {isSelected && (
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'var(--accent-purple)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 10px rgba(139, 92, 246, 0.8)'
                }}>
                  <Check size={14} color="white" />
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                {/* Preview Thumbnail */}
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '6px',
                  flexShrink: 0,
                  border: isSelected ? '1px solid var(--accent-purple)' : '1px solid transparent'
                }}>
                  <img 
                    src={style.previewUrl} 
                    alt={style.name} 
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>

                {/* Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: 700, color: isSelected ? 'var(--accent-purple)' : 'var(--text-primary)' }}>
                      {style.name}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {style.description}
                  </p>
                </div>
              </div>

              {/* Badge */}
              <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-start' }}>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: isSelected ? 'var(--accent-purple)' : 'rgba(255, 255, 255, 0.06)',
                  color: isSelected ? 'white' : 'var(--text-muted)'
                }}>
                  {style.badge}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
