import { useState } from 'react';
import type { FC, FormEvent } from 'react';
import type { AuthMode } from '../../types/auth';
import { X, Mail, Lock, User as UserIcon, Eye, EyeOff, Sparkles, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  mode: AuthMode;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  onSwitchMode: (mode: AuthMode) => void;
  onLogin: (email: string, pass: string) => Promise<unknown>;
  onRegister: (name: string, email: string, pass: string) => Promise<unknown>;
  onQuickDemoLogin: () => void;
}

export const AuthModal: FC<AuthModalProps> = ({
  isOpen,
  mode,
  isLoading,
  error,
  onClose,
  onSwitchMode,
  onLogin,
  onRegister,
  onQuickDemoLogin,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (mode === 'login') {
      await onLogin(email, password);
    } else {
      await onRegister(name, email, password);
    }
  };

  return (
    <div className="modal-overlay-backdrop">
      <div 
        className="glass-panel responsive-modal-card" 
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '32px 24px',
          position: 'relative',
          border: '1px solid rgba(139, 92, 246, 0.4)',
          boxShadow: '0 0 40px rgba(124, 58, 237, 0.3)'
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '50%',
            width: '34px',
            height: '34px',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
        >
          <X size={18} />
        </button>

        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px',
            boxShadow: '0 0 25px rgba(124, 58, 237, 0.6)'
          }}>
            <Sparkles size={28} color="white" />
          </div>

          <h3 style={{ fontSize: '1.6rem', fontWeight: 800 }}>
            {mode === 'login' ? 'Chào Mừng Trở Lại!' : 'Tạo Tài Khoản Mới'}
          </h3>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {mode === 'login' ? 'Đăng nhập để trải nghiệm AI sinh 20 sticker độc đáo' : 'Đăng ký ngay để sở hữu công cụ tạo sticker AI hàng đầu'}
          </p>
        </div>

        {/* Auth Mode Tabs Switcher */}
        <div style={{
          display: 'flex',
          padding: '4px',
          borderRadius: '99px',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid var(--border-subtle)',
          marginBottom: '24px'
        }}>
          <button
            type="button"
            onClick={() => onSwitchMode('login')}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '99px',
              border: 'none',
              background: mode === 'login' ? 'var(--accent-purple)' : 'transparent',
              color: mode === 'login' ? 'white' : 'var(--text-secondary)',
              fontWeight: mode === 'login' ? 700 : 500,
              fontSize: '0.88rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Đăng Nhập
          </button>
          <button
            type="button"
            onClick={() => onSwitchMode('register')}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '99px',
              border: 'none',
              background: mode === 'register' ? 'var(--accent-purple)' : 'transparent',
              color: mode === 'register' ? 'white' : 'var(--text-secondary)',
              fontWeight: mode === 'register' ? 700 : 500,
              fontSize: '0.88rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Đăng Ký
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            marginBottom: '20px',
            padding: '12px 14px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#fca5a5',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.85rem'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Full Name Input (Register mode only) */}
          {mode === 'register' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                Họ và tên
              </label>
              <div style={{ position: 'relative' }}>
                <UserIcon size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  required
                  placeholder="Nguyễn Văn A"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 42px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          )}

          {/* Email Input */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Địa chỉ Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px 12px 42px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Mật khẩu
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 42px 12px 42px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* CTA Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary"
            style={{
              marginTop: '10px',
              padding: '14px',
              justifyContent: 'center',
              fontSize: '1rem'
            }}
          >
            <span>{isLoading ? 'Đang Xử Lý...' : mode === 'login' ? 'Đăng Nhập Ngay' : 'Tạo Tài Khoản'}</span>
            <ArrowRight size={18} />
          </button>
        </form>

        {/* Divider */}
        <div style={{
          margin: '24px 0 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: 'var(--text-muted)',
          fontSize: '0.78rem'
        }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
          <span>Hoặc trải nghiệm nhanh</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
        </div>

        {/* Quick Demo Login Button */}
        <button
          type="button"
          onClick={onQuickDemoLogin}
          className="btn-secondary"
          style={{
            width: '100%',
            justifyContent: 'center',
            padding: '12px',
            borderColor: 'var(--border-glow)',
            color: 'var(--text-primary)'
          }}
        >
          <CheckCircle2 size={18} color="#10b981" />
          <span>Đăng Nhập Nhanh (Demo VIP User)</span>
        </button>

      </div>
    </div>
  );
};
