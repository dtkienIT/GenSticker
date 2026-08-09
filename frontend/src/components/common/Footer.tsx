import type { FC } from 'react';
import { Heart, ShieldCheck } from 'lucide-react';

export const Footer: FC = () => {
  return (
    <footer style={{ 
      borderTop: '1px solid var(--border-subtle)', 
      marginTop: '80px', 
      padding: '32px 24px', 
      background: 'var(--footer-bg)',
      backdropFilter: 'blur(10px)'
    }}>
      <div style={{ 
        maxWidth: '1280px', 
        margin: '0 auto', 
        display: 'flex', 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
          <span>© 2026 GenSticker AI. Phát triển với</span>
          <Heart size={16} color="#ec4899" fill="#ec4899" />
          <span>bằng React & AI Engine.</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={15} color="#10b981" /> 100% Bảo mật dữ liệu ảnh
          </span>
        </div>
      </div>
    </footer>
  );
};
