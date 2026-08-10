import type { FC } from 'react';
import type { User } from '../../types/auth';
import type { Theme } from '../../hooks/useTheme';
import { Sparkles, LogIn, LogOut, User as UserIcon, History, BookOpen } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface HeaderProps {
  user: User | null;
  theme: Theme;
  onToggleTheme: () => void;
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onLogout: () => void;
  onReset?: () => void;
  onOpenDocs?: () => void;
  isDocsActive?: boolean;
  onOpenHistory?: () => void;
  historyCount?: number;
}

export const Header: FC<HeaderProps> = ({
  user,
  theme,
  onToggleTheme,
  onOpenAuth,
  onLogout,
  onReset,
  onOpenDocs,
  isDocsActive = false,
  onOpenHistory,
  historyCount = 0,
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
          <div className="header-brand-copy">
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
          <button
            onClick={onOpenDocs}
            type="button"
            className={`btn-secondary header-docs-button ${isDocsActive ? 'is-active' : ''}`}
            title="Xem tài liệu dự án và source code"
            aria-label="Xem tài liệu dự án"
            aria-current={isDocsActive ? 'page' : undefined}
          >
            <BookOpen size={16} />
            <span className="btn-text-desktop">Xem tài liệu</span>
          </button>

          {/* History belongs to the signed-in account, so guests should not see it. */}
          {user && (
            <button
              onClick={onOpenHistory}
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.82rem', position: 'relative', display: 'flex', alignItems: 'center', gap: '6px' }}
              title="Xem lịch sử các bộ sticker đã tạo"
            >
              <History size={15} color="var(--accent-purple)" />
              <span className="btn-text-desktop">Lịch Sử</span>
              {historyCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
                  color: 'white',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  borderRadius: '99px',
                  padding: '1px 5px',
                  minWidth: '16px',
                  textAlign: 'center',
                  boxShadow: '0 2px 6px rgba(124, 58, 237, 0.4)'
                }}>
                  {historyCount}
                </span>
              )}
            </button>
          )}

          {/* User Auth Section */}
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
