import type { FC } from 'react';
import { Sparkles, Layers, Globe } from 'lucide-react';

interface HeaderProps {
  onReset?: () => void;
  hasActiveSession?: boolean;
}

export const Header: FC<HeaderProps> = ({ onReset, hasActiveSession }) => {
  return (
    <header className="glass-panel" style={{ borderRadius: 0, borderTop: 0, borderLeft: 0, borderRight: 0, position: 'sticky', top: 0, zIndex: 50 }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        
        {/* Brand Logo */}
        <div 
          onClick={onReset}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
        >
          <div style={{ 
            width: '42px', 
            height: '42px', 
            borderRadius: '12px', 
            background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(124, 58, 237, 0.5)'
          }}>
            <Sparkles size={22} color="white" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em' }} className="text-gradient">
                GenSticker AI
              </span>
              <span style={{ 
                fontSize: '0.7rem', 
                fontWeight: 700, 
                padding: '2px 8px', 
                borderRadius: '99px', 
                background: 'rgba(139, 92, 246, 0.2)', 
                color: '#c084fc',
                border: '1px solid rgba(139, 92, 246, 0.3)'
              }}>
                v4.0 WEB
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Biến 1 ảnh thành bộ 20 Sticker độc đáo</p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {hasActiveSession && (
            <button 
              onClick={onReset}
              className="btn-secondary"
            >
              <Sparkles size={16} color="#c084fc" />
              <span>Tạo Bộ Mới</span>
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '99px', background: 'rgba(255,255,255,0.05)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <Layers size={16} color="#06b6d4" />
            <span>20 Stickers / Batch</span>
          </div>

          <a 
            href="https://github.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn-secondary"
            style={{ padding: '8px', borderRadius: '50%' }}
            title="GitHub Repository"
          >
            <Globe size={18} />
          </a>
        </div>
      </div>
    </header>
  );
};
