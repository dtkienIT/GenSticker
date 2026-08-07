import type { FC } from 'react';
import type { User } from '../../types/auth';
import type { Theme } from '../../hooks/useTheme';
import { Sparkles, Layers, LogIn, LogOut, User as UserIcon } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  user: User | null;
  theme: Theme;
  onToggleTheme: () => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onLogout: () => void;
  onReset?: () => void;
}

export const Header: FC<HeaderProps> = ({
  user,
  theme,
  onToggleTheme,
  onOpenAuth,
  onLogout,
  onReset,
}) => {
  return (
    <header className="glass-panel" style={{ borderRadius: 0, borderTop: 0, borderLeft: 0, borderRight: 0, position: 'sticky', top: 0, zIndex: 50 }}>
      <div className="header-wrapper">
        
        {/* Brand Logo */}
        <div 
          onClick={onReset}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flexShrink: 0 }}
        >
          <div style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '12px', 
            background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(124, 58, 237, 0.5)',
            flexShrink: 0
          }}>
            <Sparkles size={20} color="white" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }} className="text-gradient">
                GenSticker AI
              </span>
              <span className="header-v4-badge" style={{ 
                fontSize: '0.65rem', 
                fontWeight: 700, 
                padding: '2px 6px', 
                borderRadius: '99px', 
                background: 'rgba(139, 92, 246, 0.2)', 
                color: '#c084fc',
                border: '1px solid rgba(139, 92, 246, 0.3)'
              }}>
                v4.0 WEB
              </span>
            </div>
            <p className="header-subtitle" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Biến 1 ảnh thành bộ 20 Sticker độc đáo</p>
          </div>
        </div>

        {/* Right Nav & User Section */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <div className="header-batch-pill" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '99px', background: 'rgba(255,255,255,0.05)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <Layers size={14} color="#06b6d4" />
            <span>20 Stickers / Batch</span>
          </div>

          {/* User Auth Section */}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '6px', borderLeft: '1px solid var(--border-subtle)' }}>
              <div className="header-user-info" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  border: '1.5px solid var(--accent-purple)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <UserIcon size={16} color="white" />
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                    {user.name}
                  </span>
                </div>
              </div>

              <button
                onClick={onLogout}
                className="btn-secondary"
                style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                title="Đăng xuất"
              >
                <LogOut size={15} color="#ef4444" />
                <span className="btn-text-desktop">Thoát</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '6px', borderLeft: '1px solid var(--border-subtle)' }}>
              <button
                onClick={() => onOpenAuth('login')}
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.82rem' }}
              >
                <LogIn size={15} />
                <span className="btn-text-desktop">Đăng Nhập</span>
              </button>

              <button
                onClick={() => onOpenAuth('register')}
                className="btn-primary"
                style={{ padding: '6px 12px', fontSize: '0.82rem' }}
              >
                <span>Đăng Ký</span>
              </button>
            </div>
          )}

          {/* Light/Dark Theme Toggle Pill Switch */}
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </div>
    </header>
  );
};
