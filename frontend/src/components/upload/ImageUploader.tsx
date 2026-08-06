import { useRef } from 'react';
import type { FC, ChangeEvent, DragEvent } from 'react';
import { UploadCloud, X, Sparkles, AlertCircle, FileCheck, LogIn } from 'lucide-react';
import { useImageUpload } from '../../hooks/useImageUpload';
import { StyleSelector } from './StyleSelector';
import type { StickerStyleId } from '../../types/sticker';

interface ImageUploaderProps {
  onStartGeneration: (file: File, previewUrl: string) => void;
  selectedStyle: StickerStyleId;
  onSelectStyle: (style: StickerStyleId) => void;
  isGenerating?: boolean;
  isAuthenticated: boolean;
  onRequestAuth: () => void;
}

const SAMPLE_AVATARS = [
  {
    name: 'Chân Dung Chibi',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><circle cx="60" cy="60" r="55" fill="%238b5cf6"/><circle cx="45" cy="50" r="10" fill="white"/><circle cx="75" cy="50" r="10" fill="white"/><circle cx="45" cy="50" r="5" fill="%231e1b4b"/><circle cx="75" cy="50" r="5" fill="%231e1b4b"/><path d="M 45 80 Q 60 98 75 80" stroke="white" stroke-width="5" fill="none"/></svg>'
  },
  {
    name: 'Mèo Máy Cute',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><circle cx="60" cy="60" r="55" fill="%23ec4899"/><polygon points="25,25 45,40 20,50" fill="%23be185d"/><polygon points="95,25 75,40 100,50" fill="%23be185d"/><circle cx="45" cy="55" r="8" fill="white"/><circle cx="75" cy="55" r="8" fill="white"/><circle cx="45" cy="55" r="4" fill="%230f172a"/><circle cx="75" cy="55" r="4" fill="%230f172a"/><ellipse cx="60" cy="70" rx="6" ry="4" fill="%23831843"/></svg>'
  },
  {
    name: 'Anime Boy',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><circle cx="60" cy="60" r="55" fill="%2306b6d4"/><path d="M 30 40 Q 60 20 90 40 L 80 65 L 40 65 Z" fill="%23155e75"/><circle cx="45" cy="65" r="8" fill="white"/><circle cx="75" cy="65" r="8" fill="white"/><circle cx="45" cy="65" r="4" fill="%23083344"/><circle cx="75" cy="65" r="4" fill="%23083344"/><path d="M 50 85 L 70 85" stroke="white" stroke-width="4" stroke-linecap="round"/></svg>'
  }
];

export const ImageUploader: FC<ImageUploaderProps> = ({
  onStartGeneration,
  selectedStyle,
  onSelectStyle,
  isGenerating = false,
  isAuthenticated,
  onRequestAuth,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const {
    file,
    previewUrl,
    error,
    isDragging,
    handleFileSelect,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    clearImage,
  } = useImageUpload();

  const onFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleSampleClick = (sampleUrl: string, sampleName: string) => {
    fetch(sampleUrl)
      .then((res) => res.blob())
      .then((blob) => {
        const sampleFile = new File([blob], `${sampleName}.svg`, { type: 'image/svg+xml' });
        handleFileSelect(sampleFile);
      });
  };

  const handleGenerateClick = () => {
    if (!isAuthenticated) {
      onRequestAuth();
      return;
    }

    if (file && previewUrl) {
      onStartGeneration(file, previewUrl);
    }
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      
      {/* Hero Header Section */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 16px',
          borderRadius: '99px',
          background: 'rgba(139, 92, 246, 0.12)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          color: '#c084fc',
          fontSize: '0.85rem',
          fontWeight: 600,
          marginBottom: '16px'
        }}>
          <Sparkles size={16} />
          <span>Tự Động Sinh 20 Sticker Cảm Xúc Bằng AI Engine</span>
        </div>

        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.03em' }}>
          Tải Ảnh Lên & <span className="text-gradient">Tạo Bộ Sticker AI</span>
        </h1>
        <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', marginTop: '10px', maxWidth: '640px', margin: '10px auto 0' }}>
          Chỉ cần 1 bức ảnh chân dung hoặc nhân vật, hệ thống AI sẽ tự động tách nền, tạo nét vẽ và sinh trọn bộ 20 sticker biểu cảm sắc nét.
        </p>
      </div>

      {/* Main Glass Panel Uploader */}
      <div className="glass-panel" style={{ padding: '32px' }}>
        
        {!previewUrl ? (
          /* Drag and Drop Zone */
          <div
            onDrop={(e: DragEvent<HTMLDivElement>) => handleDrop(e)}
            onDragOver={(e: DragEvent<HTMLDivElement>) => handleDragOver(e)}
            onDragLeave={(e: DragEvent<HTMLDivElement>) => handleDragLeave(e)}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: isDragging ? '2px dashed var(--accent-purple)' : '2px dashed rgba(255, 255, 255, 0.15)',
              borderRadius: 'var(--radius-md)',
              padding: '48px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              background: isDragging ? 'rgba(139, 92, 246, 0.1)' : 'rgba(255, 255, 255, 0.02)',
              transition: 'all 0.3s ease',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/png, image/jpeg, image/webp" 
              onChange={onFileInputChange}
              style={{ display: 'none' }}
            />

            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.2) 0%, rgba(236, 72, 153, 0.2) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }} className="animate-float">
              <UploadCloud size={32} color="#c084fc" />
            </div>

            <h4 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '6px' }}>
              Kéo thả ảnh vào đây, hoặc <span className="text-gradient">bấm để chọn file</span>
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Hỗ trợ PNG, JPG, WEBP (Tối đa 15MB) - Khuyên dùng ảnh rõ nét khuôn mặt
            </p>

            {/* Quick Sample Avatars */}
            <div 
              onClick={(e) => e.stopPropagation()}
              style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)', width: '100%', maxWidth: '440px' }}
            >
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '12px', fontWeight: 600 }}>
                Hoặc thử nhanh với ảnh mẫu:
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
                {SAMPLE_AVATARS.map((sample, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSampleClick(sample.url, sample.name)}
                    style={{
                      background: 'var(--btn-secondary-bg)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '6px 12px',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.8rem',
                      transition: 'all 0.2s ease'
                    }}
                    className="glass-card-interactive"
                  >
                    <img src={sample.url} alt={sample.name} style={{ width: '24px', height: '24px' }} />
                    <span>{sample.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Preview Selected Image */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <div style={{
                width: '180px',
                height: '180px',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                border: '2px solid var(--accent-purple)',
                boxShadow: 'var(--shadow-glow)',
                background: 'var(--bg-secondary)'
              }}>
                <img 
                  src={previewUrl} 
                  alt="Original Preview" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              {/* Clear button */}
              <button
                onClick={clearImage}
                style={{
                  position: 'absolute',
                  top: '-10px',
                  right: '-10px',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 10px rgba(0, 0, 0, 0.5)'
                }}
                title="Chọn ảnh khác"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--accent-emerald)', fontSize: '0.9rem', fontWeight: 600 }}>
                <FileCheck size={18} />
                <span>Đã chọn ảnh: {file?.name}</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {(file?.size ? (file.size / 1024 / 1024).toFixed(2) : 0)} MB
              </p>
            </div>
          </div>
        )}

        {/* Error alert if any */}
        {error && (
          <div style={{
            marginTop: '16px',
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#fca5a5',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.88rem'
          }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Style Selector */}
        <StyleSelector 
          selectedStyle={selectedStyle} 
          onSelectStyle={onSelectStyle}
          disabled={isGenerating}
        />

        {/* CTA Generate Button */}
        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          {!isAuthenticated && (
            <p style={{ fontSize: '0.85rem', color: 'var(--accent-pink)', marginBottom: '12px', fontWeight: 600 }}>
              🔒 Bạn cần đăng nhập tài khoản để sử dụng dịch vụ sinh sticker AI
            </p>
          )}

          <button
            onClick={handleGenerateClick}
            disabled={(!file && isAuthenticated) || isGenerating}
            className="btn-primary"
            style={{
              padding: '16px 40px',
              fontSize: '1.1rem',
              width: '100%',
              maxWidth: '380px',
              justifyContent: 'center'
            }}
          >
            {isAuthenticated ? (
              <>
                <Sparkles size={22} className="animate-spin-slow" />
                <span>Tạo Bộ 20 Sticker Ngay</span>
              </>
            ) : (
              <>
                <LogIn size={20} />
                <span>Đăng Nhập Để Tạo Sticker</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
