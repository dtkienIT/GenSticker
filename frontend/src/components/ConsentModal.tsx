import React, { useState } from 'react';
import './ConsentModal.css';
import { useLanguage, t } from '../i18n/i18n';

interface ConsentModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConsentModal: React.FC<ConsentModalProps> = ({ isOpen, onConfirm, onCancel }) => {
  const { language } = useLanguage();
  const [checked, setChecked] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content fadeIn">
        <h2>{t('consent_title', language)}</h2>
        <p>{t('consent_text', language)}</p>
        <label className="checkbox-container">
          <input 
            type="checkbox" 
            id="consent-checkbox"
            checked={checked} 
            onChange={(e) => setChecked(e.target.checked)} 
          />
          <span className="checkmark"></span>
          {t('consent_checkbox', language)}
        </label>
        <div className="modal-actions">
          <button id="consent-cancel-btn" className="btn-secondary" onClick={onCancel}>
            {t('btn_cancel', language)}
          </button>
          <button 
            id="consent-continue-btn"
            className="btn-primary" 
            disabled={!checked}
            onClick={onConfirm}
          >
            {t('btn_continue', language)}
          </button>
        </div>
      </div>
    </div>
  );
};
