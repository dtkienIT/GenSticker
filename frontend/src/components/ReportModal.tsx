import React, { useState } from 'react';
import './ReportModal.css';
import { useLanguage, t } from '../i18n/i18n';
import { ReportCategory } from '../types';

interface ReportModalProps {
  isOpen: boolean;
  onSubmit: (category: ReportCategory, details: string) => void;
  onCancel: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onSubmit, onCancel }) => {
  const { language } = useLanguage();
  const [category, setCategory] = useState<ReportCategory>('inappropriate_content');
  const [details, setDetails] = useState('');

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content fadeIn">
        <h2>{t('report_title', language)}</h2>
        <div className="report-options">
          {(['unauthorized_likeness', 'inappropriate_content', 'copyright_violation', 'other'] as ReportCategory[]).map(cat => (
            <label key={cat} className="radio-label">
              <input 
                type="radio" 
                name="report_category" 
                value={cat} 
                checked={category === cat}
                onChange={() => setCategory(cat)}
              />
              {t(`report_cat_${cat}`, language)}
            </label>
          ))}
        </div>
        <textarea 
          className="report-textarea"
          placeholder={t('report_placeholder', language)}
          value={details}
          onChange={e => setDetails(e.target.value)}
        />
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onCancel}>{t('btn_cancel', language)}</button>
          <button className="btn-primary" onClick={() => onSubmit(category, details)}>{t('btn_submit', language)}</button>
        </div>
      </div>
    </div>
  );
};
