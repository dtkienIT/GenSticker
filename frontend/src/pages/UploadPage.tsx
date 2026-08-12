import React, { useState, useRef } from 'react';
import './UploadPage.css';
import { useLanguage, t } from '../i18n/i18n';
import { AppStep } from '../types';
import { validateImage } from '../services/api';
import { ConsentModal } from '../components/ConsentModal';

interface UploadPageProps {
  onNavigate: (step: AppStep) => void;
  onImageReady: (base64: string, mime: string) => void;
}

export const UploadPage: React.FC<UploadPageProps> = ({ onNavigate, onImageReady }) => {
  const { language } = useLanguage();
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError(t('upload_error_type', language));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError(t('upload_error_size', language));
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setPreview(base64);
      setMimeType(file.type);
      setIsValidating(true);
      
      const b64Data = base64.split(',')[1];
      const res = await validateImage(b64Data, file.type);
      setIsValidating(false);
      
      if (!res.valid) {
        setError(res.error_message || 'Validation failed');
        setPreview(null);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="upload-page">
      <div 
        className={`drop-zone ${dragActive ? 'active' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
      >
        {preview ? (
          <div className="preview-container">
            <img src={preview} alt="Preview" className="upload-preview" />
          </div>
        ) : (
          <div className="drop-content">
            <span className="camera-emoji">📸</span>
            <h3>{t('upload_instruction', language)}</h3>
            <div className="upload-actions">
              <button className="btn-secondary" onClick={() => fileInputRef.current?.click()}>
                {t('upload_btn_file', language)}
              </button>
              <button className="btn-secondary" onClick={() => cameraInputRef.current?.click()}>
                {t('upload_btn_camera', language)}
              </button>
            </div>
          </div>
        )}
      </div>

      <input type="file" ref={fileInputRef} hidden accept="image/jpeg, image/png, image/webp" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      <input type="file" ref={cameraInputRef} hidden accept="image/*" capture="user" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

      {error && <div className="error-card">{error}</div>}
      
      {isValidating && <div className="loading-text">Validating...</div>}

      {preview && !isValidating && !error && (
        <button className="btn-primary btn-large generate-btn bounceIn" onClick={() => setShowConsent(true)}>
          {t('upload_generate', language)}
        </button>
      )}

      <ConsentModal 
        isOpen={showConsent} 
        onCancel={() => setShowConsent(false)}
        onConfirm={() => {
          setShowConsent(false);
          onImageReady(preview!.split(',')[1], mimeType);
          onNavigate('generating');
        }}
      />
    </div>
  );
};
