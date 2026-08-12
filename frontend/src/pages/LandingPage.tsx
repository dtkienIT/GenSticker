import React from 'react';
import './LandingPage.css';
import { useLanguage, t } from '../i18n/i18n';
import { AppStep } from '../types';

interface LandingPageProps {
  onNavigate: (step: AppStep) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const { language } = useLanguage();

  return (
    <div className="landing-page">
      <div className="hero-section">
        <div className="hero-emoji float">🎨</div>
        <h1 className="hero-title">{t('app_title', language)}</h1>
        <p className="hero-tagline">{t('app_tagline', language)}</p>
        
        <div className="hero-actions">
          <button 
            id="btn-create" 
            className="btn-primary btn-large wiggle-hover"
            onClick={() => onNavigate('upload')}
          >
            {t('btn_create', language)}
          </button>
          <button 
            id="btn-tray" 
            className="btn-secondary btn-large"
            onClick={() => onNavigate('tray')}
          >
            {t('btn_tray', language)}
          </button>
        </div>
      </div>
      
      <div className="bg-emojis">
        <span className="bg-emoji emoji-1">😊</span>
        <span className="bg-emoji emoji-2">😎</span>
        <span className="bg-emoji emoji-3">😍</span>
        <span className="bg-emoji emoji-4">😂</span>
      </div>
    </div>
  );
};
