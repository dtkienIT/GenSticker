import React, { useState, useEffect } from 'react';
import './TrayPage.css';
import { useLanguage, t } from '../i18n/i18n';
import { AppStep, StickerPack, Sticker, ReportCategory } from '../types';
import { getPacks, deletePack, deleteSticker, getImageBlob } from '../services/storage';
import { StickerCard } from '../components/StickerCard';
import { ReportModal } from '../components/ReportModal';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { trackEvent } from '../services/analytics';

interface TrayPageProps {
  onNavigate: (step: AppStep) => void;
}

/** Helper component that loads a sticker image from IndexedDB and renders a StickerCard */
const TraySticker: React.FC<{
  sticker: Sticker;
  onDownload: (id: string) => void;
  onDelete: (id: string) => void;
  onReport: (id: string) => void;
}> = ({ sticker, onDownload, onDelete, onReport }) => {
  const [loaded, setLoaded] = useState<Sticker | null>(null);

  useEffect(() => {
    getImageBlob(sticker.id).then(b64 => {
      if (b64) {
        setLoaded({ ...sticker, imageBase64: b64, selected: false });
      }
    });
  }, [sticker.id]);

  return (
    <StickerCard
      sticker={loaded ?? undefined}
      isLoading={!loaded}
      onDownload={onDownload}
      onDelete={onDelete}
      onReport={onReport}
    />
  );
};

export const TrayPage: React.FC<TrayPageProps> = ({ onNavigate }) => {
  const { language } = useLanguage();
  const [packs, setPacks] = useState<StickerPack[]>([]);
  const [expandedPack, setExpandedPack] = useState<string | null>(null);
  const [reportStickerId, setReportStickerId] = useState<string | null>(null);

  useEffect(() => {
    setPacks(getPacks());
  }, []);

  const handleDeletePack = async (id: string) => {
    if (confirm(t('btn_delete', language) + '?')) {
      await deletePack(id);
      setPacks(getPacks());
      trackEvent('pack_deleted', { packId: id });
    }
  };

  const handleDeleteSticker = async (stickerId: string) => {
    const pack = packs.find(p => p.stickers.some(s => s.id === stickerId));
    if (pack) {
      await deleteSticker(pack.id, stickerId);
      setPacks(getPacks());
      trackEvent('sticker_deleted', { stickerId });
    }
  };

  const handleDownloadPack = async (pack: StickerPack) => {
    const zip = new JSZip();
    for (const s of pack.stickers) {
      const b64 = await getImageBlob(s.id);
      if (b64) {
        // b64 may be a data URL or raw base64
        const rawData = b64.includes(',') ? b64.split(',')[1] : b64;
        zip.file(`${s.expressionId}_${s.id}.png`, rawData, { base64: true });
      }
    }
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `duhat_stickers_${pack.id}.zip`);
    trackEvent('pack_downloaded', { packId: pack.id });
  };

  const handleDownloadSticker = async (id: string) => {
    const b64 = await getImageBlob(id);
    if (b64) {
      // Convert base64 to blob for download
      const rawData = b64.includes(',') ? b64.split(',')[1] : b64;
      const byteString = atob(rawData);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: 'image/png' });
      saveAs(blob, `sticker_${id}.png`);
      trackEvent('sticker_downloaded', { stickerId: id });
    }
  };

  const handleReport = (category: ReportCategory, details: string) => {
    trackEvent('sticker_reported', { stickerId: reportStickerId, category, details });
    setReportStickerId(null);
  };

  const StkImage = ({ id }: { id: string }) => {
    const [src, setSrc] = useState('');
    useEffect(() => { getImageBlob(id).then(b => { if (b) setSrc(b); }); }, [id]);
    return src ? <img src={src} className="pack-thumb" alt="sticker" /> : <div className="pack-thumb skeleton shimmer" />;
  };

  if (packs.length === 0) {
    return (
      <div className="tray-page empty">
        <div className="empty-icon float">📭</div>
        <h2>{t('tray_empty', language)}</h2>
        <button id="tray-create-btn" className="btn-primary" onClick={() => onNavigate('upload')}>
          {t('btn_create_new', language)}
        </button>
      </div>
    );
  }

  return (
    <div className="tray-page">
      <div className="tray-header">
        <h2>{t('btn_tray', language)}</h2>
      </div>
      
      <div className="packs-list">
        {packs.map(pack => (
          <div key={pack.id} className="pack-card">
            <div className="pack-header" onClick={() => setExpandedPack(expandedPack === pack.id ? null : pack.id)}>
              <div className="pack-info">
                {pack.stickers[0] && <StkImage id={pack.stickers[0].id} />}
                <div>
                  <div className="pack-date">{new Date(pack.createdAt).toLocaleDateString()}</div>
                  <div className="pack-count">{pack.stickers.length} stickers</div>
                </div>
              </div>
              <div className="pack-actions">
                <button className="icon-btn" title={t('btn_download', language)} onClick={(e) => { e.stopPropagation(); handleDownloadPack(pack); }}>⬇️</button>
                <button className="icon-btn text-danger" title={t('btn_delete', language)} onClick={(e) => { e.stopPropagation(); handleDeletePack(pack.id); }}>🗑️</button>
              </div>
            </div>
            
            {expandedPack === pack.id && (
              <div className="pack-grid slideUp">
                {pack.stickers.map(stk => (
                  <TraySticker
                    key={stk.id}
                    sticker={stk}
                    onDownload={handleDownloadSticker}
                    onDelete={handleDeleteSticker}
                    onReport={(id) => setReportStickerId(id)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <button id="tray-fab-btn" className="fab btn-primary" onClick={() => onNavigate('upload')}>+</button>

      <ReportModal
        isOpen={reportStickerId !== null}
        onSubmit={handleReport}
        onCancel={() => setReportStickerId(null)}
      />
    </div>
  );
};
