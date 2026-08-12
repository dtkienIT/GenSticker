import React, { useState, useEffect, useCallback } from 'react';
import './PreviewPage.css';
import { useLanguage, t } from '../i18n/i18n';
import { AppStep, Sticker, EXPRESSIONS, ReportCategory } from '../types';
import { StickerCard } from '../components/StickerCard';
import { ReportModal } from '../components/ReportModal';
import { compositeTextOnSticker } from '../services/textCompositor';
import { savePack } from '../services/storage';
import { trackEvent } from '../services/analytics';

interface PreviewPageProps {
  initialStickers: Sticker[];
  regenCount: number;
  onRegenerate: () => void;
  onNavigate: (step: AppStep) => void;
}

export const PreviewPage: React.FC<PreviewPageProps> = ({ initialStickers, regenCount, onRegenerate, onNavigate }) => {
  const { language } = useLanguage();
  const [stickers, setStickers] = useState<Sticker[]>(initialStickers);
  const [isCompositing, setIsCompositing] = useState(true);
  const [saved, setSaved] = useState(false);
  const [reportStickerId, setReportStickerId] = useState<string | null>(null);

  useEffect(() => {
    const applyText = async () => {
      try {
        const composited = await Promise.all(initialStickers.map(async (stk) => {
          const config = EXPRESSIONS.find(e => e.id === stk.expressionId);
          if (!config) return stk;
          const text = language === 'en' ? config.nameEn : config.nameVi;
          try {
            const newImage = await compositeTextOnSticker(stk.imageBase64, text, config.color);
            return { ...stk, imageBase64: newImage };
          } catch (err) {
            console.error('Text composite failed for', stk.expressionId, err);
            return stk; // Use original image if compositing fails
          }
        }));
        setStickers(composited);
      } catch (err) {
        console.error('Text compositing failed:', err);
        setStickers(initialStickers); // Fallback to originals
      } finally {
        setIsCompositing(false);
      }
    };
    applyText();
  }, [initialStickers, language]);

  const toggleSelect = useCallback((id: string) => {
    setStickers(prev => prev.map(s => s.id === id ? { ...s, selected: !s.selected } : s));
    trackEvent('sticker_toggled');
  }, []);

  const selectAll = (select: boolean) => {
    setStickers(prev => prev.map(s => ({ ...s, selected: select })));
  };

  const handleSave = async () => {
    const selectedStickers = stickers.filter(s => s.selected);
    await savePack({
      id: `pack_${Date.now()}`,
      createdAt: new Date().toISOString(),
      stickers: selectedStickers
    });
    setSaved(true);
    trackEvent('pack_saved', { count: selectedStickers.length });
    setTimeout(() => onNavigate('tray'), 1500);
  };

  const handleReport = (category: ReportCategory, details: string) => {
    trackEvent('sticker_reported', { stickerId: reportStickerId, category, details });
    setReportStickerId(null);
  };

  if (isCompositing) {
    return <div className="preview-page loading"><div className="spinner float">✨</div><p>Applying magic...</p></div>;
  }

  return (
    <div className="preview-page">
      {stickers.length < 8 && <div className="notice-banner">{t('preview_notice', language)}</div>}
      
      <div className="preview-actions">
        <button className="btn-secondary btn-sm" onClick={() => selectAll(true)}>{t('btn_select_all', language)}</button>
        <button className="btn-secondary btn-sm" onClick={() => selectAll(false)}>{t('btn_deselect_all', language)}</button>
      </div>

      <div className="sticker-grid">
        {stickers.map(stk => (
          <StickerCard 
            key={stk.id} 
            sticker={stk} 
            onToggleSelect={toggleSelect}
            onReport={(id) => setReportStickerId(id)}
          />
        ))}
      </div>

      <div className="bottom-actions">
        <button 
          className="btn-secondary" 
          disabled={regenCount === 0}
          onClick={onRegenerate}
        >
          {t('btn_regenerate', language, { count: regenCount })}
        </button>
        <button 
          className={`btn-primary btn-large ${saved ? 'success' : ''}`}
          onClick={handleSave}
          disabled={stickers.filter(s => s.selected).length === 0 || saved}
        >
          {saved ? t('preview_success', language) : t('btn_save', language)}
        </button>
      </div>

      <ReportModal
        isOpen={reportStickerId !== null}
        onSubmit={handleReport}
        onCancel={() => setReportStickerId(null)}
      />
    </div>
  );
};
