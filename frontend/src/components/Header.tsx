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
          <button id="header-back-btn" className="back-btn" onClick={onBack} aria-label="Go back">
            ‹
          </button>
        )}
        <div className="brand-badge">
          <img src="/logo-mark-transparent.png" alt="DUHAT Logo" className="brand-logo-img" />
          <h1 className="header-title">DUHAT</h1>
        </div>

      </div>
      
      <div className="header-center">
        <div className="security-pill">
          <span className="security-dot"></span>
          <span>DUHAT AI Secure</span>
        </div>
      </div>

      <div className="header-right">
        <LanguageToggle />
      </div>
    </header>
  );
};


