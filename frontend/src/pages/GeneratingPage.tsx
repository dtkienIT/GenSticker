import React, { useEffect, useState, useRef, useCallback } from 'react';
import './GeneratingPage.css';
import { useLanguage, t } from '../i18n/i18n';
import { AppStep, GenerateResult, Sticker, EXPRESSIONS, ExpressionId } from '../types';
import { generatePack } from '../services/api';
import { StickerCard } from '../components/StickerCard';
import { trackEvent } from '../services/analytics';

interface GeneratingPageProps {
  imageBase64: string;
  mimeType: string;
  onDone: (stickers: Sticker[]) => void;
  onNavigate: (step: AppStep) => void;
}

export const GeneratingPage: React.FC<GeneratingPageProps> = ({ imageBase64, mimeType, onDone, onNavigate }) => {
  const { language } = useLanguage();
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [failedExpressions, setFailedExpressions] = useState<Set<ExpressionId>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);
  
  // Use refs to avoid re-triggering the effect when callbacks change
  const onDoneRef = useRef(onDone);
  const onNavigateRef = useRef(onNavigate);
  onDoneRef.current = onDone;
  onNavigateRef.current = onNavigate;
  
  useEffect(() => {
    let currentStickers: Sticker[] = [];
    const failed = new Set<ExpressionId>();
    
    trackEvent('generation_started');
    
    const cancel = generatePack(
      imageBase64,
      mimeType,
      (result: GenerateResult) => {
        if (result.filtered || !result.success) {
          failed.add(result.expression_id);
          setFailedExpressions(new Set(failed));
        } else if (result.image_base64) {
          const b64Data = result.image_base64.startsWith('data:') 
            ? result.image_base64 
            : `data:image/png;base64,${result.image_base64}`;
          const newSticker: Sticker = {
            id: `stk_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
            expressionId: result.expression_id,
            imageBase64: b64Data,
            selected: true
          };
          currentStickers = [...currentStickers, newSticker];
          setStickers([...currentStickers]);
        }
      },
      () => {
        setIsDone(true);
        trackEvent('generation_completed', { count: currentStickers.length });
        onDoneRef.current(currentStickers);
        onNavigateRef.current('preview');
      },
      (err) => {
        setError(err);
        trackEvent('generation_failed', { error: err });
      }
    );
    
    return () => cancel();
  }, [imageBase64, mimeType]);

  return (
    <div className="generating-page">
      <div className="progress-header">
        <div className="spinner float">✨</div>
        <h2>{t('generating_progress', language, { current: stickers.length, total: 8 })}</h2>
      </div>
      
      {error && <div className="error-card">{error}</div>}

      <div className="sticker-grid">
        {EXPRESSIONS.map((exp) => {
          const sticker = stickers.find(s => s.expressionId === exp.id);
          const isFailed = failedExpressions.has(exp.id);
          
          if (isFailed) {
            return (
              <div key={exp.id} className="sticker-card filtered">
                <div className="filtered-icon">🚫</div>
                <div className="filtered-text">{t('preview_notice', language)}</div>
              </div>
            );
          }
          
          return (
             <StickerCard 
                key={exp.id} 
                sticker={sticker} 
                isLoading={!sticker && !isDone} 
             />
          );
        })}
      </div>
      
      <button className="btn-secondary cancel-btn" onClick={() => onNavigate('upload')}>
        {t('btn_cancel', language)}
      </button>
    </div>
  );
};
