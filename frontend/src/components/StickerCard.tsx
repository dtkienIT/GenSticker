import React, { useState } from 'react';
import './StickerCard.css';
import { Sticker, EXPRESSIONS } from '../types';
import { useLanguage, t } from '../i18n/i18n';

interface StickerCardProps {
  sticker?: Sticker;
  isLoading?: boolean;
  onToggleSelect?: (id: string) => void;
  onReport?: (id: string) => void;
  onDownload?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const StickerCard: React.FC<StickerCardProps> = ({ 
  sticker, isLoading, onToggleSelect, onReport, onDownload, onDelete 
}) => {
  const { language } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);

  if (isLoading || !sticker) {
    return <div className="sticker-card skeleton shimmer"></div>;
  }

  const expConfig = EXPRESSIONS.find(e => e.id === sticker.expressionId);

  return (
    <div className={`sticker-card bounceIn ${sticker.selected ? 'selected' : ''}`}>
      <img src={sticker.imageBase64} alt={expConfig?.nameEn} className="sticker-img" />
      
      {onToggleSelect && (
        <input 
          type="checkbox" 
          className="sticker-checkbox"
          checked={sticker.selected}
          onChange={() => onToggleSelect(sticker.id)}
        />
      )}

      {(onReport || onDownload || onDelete) && (
        <div className="sticker-menu-container">
          <button className="sticker-menu-btn" onClick={() => setMenuOpen(!menuOpen)}>⋮</button>
          {menuOpen && (
            <div className="sticker-menu">
              {onDownload && <button onClick={() => { setMenuOpen(false); onDownload(sticker.id); }}>{t('btn_download', language)}</button>}
              {onReport && <button onClick={() => { setMenuOpen(false); onReport(sticker.id); }}>{t('report_title', language)}</button>}
              {onDelete && <button onClick={() => { setMenuOpen(false); onDelete(sticker.id); }} className="text-danger">{t('btn_delete', language)}</button>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
