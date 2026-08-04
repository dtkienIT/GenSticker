import type { FC } from 'react';
import type { User } from '../../types/auth';
import { Sparkles, Layers, Globe, LogIn, LogOut, User as UserIcon } from 'lucide-react';

interface HeaderProps {
  user: User | null;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onLogout: () => void;
  onReset?: () => void;
  hasActiveSession?: boolean;
}

export const Header: FC<HeaderProps> = ({
  user,
  onOpenAuth,
  onLogout,
  onReset,
  hasActiveSession,
}) => {
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

        {/* Right Nav & User Section */}
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

          {/* User Auth Section */}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingLeft: '8px', borderLeft: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '1.5px solid var(--accent-purple)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <UserIcon size={18} color="white" />
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {user.name}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>
                    ● Đã Đăng Nhập
                  </span>
                </div>
              </div>

              <button
                onClick={onLogout}
                className="btn-secondary"
                style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                title="Đăng xuất"
              >
                <LogOut size={16} color="#ef4444" />
                <span>Thoát</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '8px', borderLeft: '1px solid var(--border-subtle)' }}>
              <button
                onClick={() => onOpenAuth('login')}
                className="btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              >
                <LogIn size={16} />
                <span>Đăng Nhập</span>
              </button>

              <button
                onClick={() => onOpenAuth('register')}
                className="btn-primary"
                style={{ padding: '8px 18px', fontSize: '0.85rem' }}
              >
                <span>Đăng Ký</span>
              </button>
            </div>
          )}

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
