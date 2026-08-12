import React from 'react';
import './LanguageToggle.css';
import { useLanguage } from '../i18n/i18n';

export const LanguageToggle: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const toggleLang = () => setLanguage(language === 'en' ? 'vi' : 'en');

  return (
    <button id="lang-toggle" className={`lang-toggle ${language}`} onClick={toggleLang}>
      <span className="lang-icon">{language === 'en' ? '🇺🇸' : '🇻🇳'}</span>
      <span className="lang-label">{language.toUpperCase()}</span>
    </button>
  );
};
