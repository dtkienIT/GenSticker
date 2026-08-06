import type { FC } from 'react';
import type { Theme } from '../../hooks/useTheme';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
}

export const ThemeToggle: FC<ThemeToggleProps> = ({ theme, onToggle }) => {
  const isLight = theme === 'light';

  return (
    <div
      onClick={onToggle}
      style={{
        width: '74px',
        height: '38px',
        borderRadius: '999px',
        border: '1.5px solid var(--border-subtle)',
        background: 'var(--btn-secondary-bg)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        cursor: 'pointer',
        padding: '3px',
        boxSizing: 'border-box',
        userSelect: 'none',
        transition: 'all 0.3s ease',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
      }}
      title={isLight ? 'Chuyển sang Giao diện Tối' : 'Chuyển sang Giao diện Sáng'}
    >
      {/* Sliding Purple Pill */}
      <div
        style={{
          position: 'absolute',
          top: '3px',
          left: '3px',
          width: '30px',
          height: '30px',
          borderRadius: '999px',
          background: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
          boxShadow: '0 2px 10px rgba(124, 58, 237, 0.5)',
          transition: 'transform 0.3s cubic-bezier(0.34, 1.35, 0.64, 1)',
          transform: isLight ? 'translateX(0px)' : 'translateX(35px)',
          zIndex: 1
        }}
      />

      {/* Sun Icon (Left - Light Mode) */}
      <div
        style={{
          width: '30px',
          height: '30px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
          color: isLight ? '#ffffff' : 'var(--text-muted)',
          transition: 'color 0.3s ease'
        }}
      >
        <Sun size={17} strokeWidth={2.2} />
      </div>

      {/* Moon Icon (Right - Dark Mode) */}
      <div
        style={{
          width: '30px',
          height: '30px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2,
          marginLeft: '5px',
          color: !isLight ? '#ffffff' : 'var(--text-muted)',
          transition: 'color 0.3s ease'
        }}
      >
        <Moon size={17} strokeWidth={2.2} />
      </div>
    </div>
  );
};
