import React from 'react';
import './Header.css';
import { LanguageToggle } from './LanguageToggle';

interface HeaderProps {
  showBack?: boolean;
  onBack?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ showBack, onBack }) => {
  return (
    <header className="app-header">
      <div className="header-left">
        {showBack && (
          <button id="header-back-btn" className="back-btn" onClick={onBack}>
            ←
          </button>
        )}
        <h1 className="header-title">DUHAT</h1>
      </div>
      <div className="header-right">
        <LanguageToggle />
      </div>
    </header>
  );
};
