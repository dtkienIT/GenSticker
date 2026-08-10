import { useRef } from 'react';
import type { FC, ChangeEvent, DragEvent } from 'react';
import { UploadCloud, X, Sparkles, AlertCircle, Loader2, LogIn, ShieldCheck } from 'lucide-react';
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
    faceCheckStatus,
    pendingFileName,
    handleFileSelect,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    clearImage,
  } = useImageUpload();

  const isCheckingFace = faceCheckStatus === 'checking';
  const isFaceVerified = faceCheckStatus === 'verified';
  const isUploadDisabled = isGenerating || isCheckingFace;

  const onFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    e.target.value = '';
    if (selectedFile) void handleFileSelect(selectedFile);
  };

  const handleGenerateClick = () => {
    if (!isAuthenticated) {
      onRequestAuth();
      return;
    }

    if (file && previewUrl && isFaceVerified) {
      onStartGeneration(file, previewUrl);
    }
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      
      {/* Hero Header Section */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div className="responsive-hero-badge">
          <Sparkles size={16} />
          <span>Tự Động Sinh 20 Sticker Cảm Xúc Bằng AI Engine</span>
        </div>

        <h1 className="responsive-hero-title">
          Tải Ảnh Lên & <span className="text-gradient">Tạo Bộ Sticker AI</span>
        </h1>
        <p style={{ fontSize: '0.98rem', color: 'var(--text-secondary)', marginTop: '10px', maxWidth: '640px', margin: '10px auto 0' }}>
          Chọn ảnh chân dung có đúng một khuôn mặt rõ ràng. Hệ thống sẽ kiểm tra ngay trên thiết bị trước khi tạo trọn bộ 20 sticker biểu cảm.
        </p>
      </div>

      {/* Main Glass Panel Uploader */}
      <div className="glass-panel responsive-panel">
        
        {!previewUrl ? (
          /* Drag and Drop Zone */
          <div
            data-face-check-status={faceCheckStatus}
            role="button"
            tabIndex={isUploadDisabled ? -1 : 0}
            aria-busy={isCheckingFace}
            aria-label={isCheckingFace ? 'Đang kiểm tra khuôn mặt' : 'Chọn ảnh chân dung'}
            onDrop={(e: DragEvent<HTMLDivElement>) => {
              if (isUploadDisabled) {
                e.preventDefault();
                return;
              }
              handleDrop(e);
            }}
            onDragOver={(e: DragEvent<HTMLDivElement>) => {
              if (isUploadDisabled) {
                e.preventDefault();
                return;
              }
              handleDragOver(e);
            }}
            onDragLeave={(e: DragEvent<HTMLDivElement>) => handleDragLeave(e)}
            onClick={() => {
              if (!isUploadDisabled) fileInputRef.current?.click();
            }}
            onKeyDown={(event) => {
              if (!isUploadDisabled && (event.key === 'Enter' || event.key === ' ')) {
                event.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            style={{
              border: isDragging ? '2px dashed var(--accent-purple)' : '2px dashed rgba(255, 255, 255, 0.15)',
              borderRadius: 'var(--radius-md)',
              padding: '36px 16px',
              textAlign: 'center',
              cursor: isUploadDisabled ? 'wait' : 'pointer',
              background: isCheckingFace
                ? 'linear-gradient(135deg, rgba(124, 58, 237, 0.1), rgba(6, 182, 212, 0.06))'
                : isDragging
                  ? 'rgba(139, 92, 246, 0.1)'
                  : 'rgba(255, 255, 255, 0.02)',
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
              disabled={isUploadDisabled}
              aria-label="Chọn ảnh chân dung có đúng một khuôn mặt"
              style={{
                position: 'absolute',
                width: '1px',
                height: '1px',
                opacity: 0,
                pointerEvents: 'none',
              }}
            />

            {isCheckingFace ? (
              <div role="status" aria-live="polite" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.22), rgba(6, 182, 212, 0.18))',
                  border: '1px solid rgba(139, 92, 246, 0.45)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '14px',
                }}>
                  <Loader2 size={28} color="#c084fc" className="animate-spin-slow" />
                </div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>
                  Đang kiểm tra khuôn mặt…
                </h4>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', overflowWrap: 'anywhere' }}>
                  {pendingFileName}
                </p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                  Xử lý miễn phí ngay trên thiết bị, ảnh chưa được gửi lên máy chủ.
                </p>
              </div>
            ) : (
              <>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.2) 0%, rgba(236, 72, 153, 0.2) 100%)',
                  border: '1px solid rgba(139, 92, 246, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '14px',
                }} className="animate-float">
                  <UploadCloud size={28} color="#c084fc" />
                </div>

                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '6px' }}>
                  Kéo thả ảnh vào đây, hoặc <span className="text-gradient">bấm để chọn file</span>
                </h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  PNG, JPG hoặc WEBP · Tối đa 15MB · Chỉ một khuôn mặt người
                </p>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '7px',
                  marginTop: '18px',
                  padding: '8px 12px',
                  borderRadius: '999px',
                  color: 'var(--accent-emerald)',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.22)',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                }}>
                  <ShieldCheck size={15} />
                  <span>Kiểm tra cục bộ · Không dùng GPU hay API trả phí</span>
                </div>
              </>
            )}
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
                type="button"
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
                aria-label="Xóa ảnh và chọn ảnh khác"
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--accent-emerald)', fontSize: '0.9rem', fontWeight: 600 }}>
                <ShieldCheck size={18} />
                <span>Đã xác nhận đúng 1 khuôn mặt</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', overflowWrap: 'anywhere' }}>
                {file?.name} · {(file?.size ? (file.size / 1024 / 1024).toFixed(2) : 0)} MB
              </p>
            </div>
          </div>
        )}

        {/* Error alert if any */}
        {error && (
          <div role="alert" aria-live="assertive" style={{
            marginTop: '16px',
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--alert-error-bg)',
            border: '1px solid var(--alert-error-border)',
            color: 'var(--alert-error-text)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.88rem',
            fontWeight: 600
          }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Style Selector */}
        <StyleSelector 
          selectedStyle={selectedStyle} 
          onSelectStyle={onSelectStyle}
          disabled={isGenerating || isCheckingFace}
        />

        {/* CTA Generate Button */}
        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          {!isAuthenticated && (
            <p style={{ fontSize: '0.85rem', color: 'var(--accent-pink)', marginBottom: '12px', fontWeight: 600 }}>
              🔒 Bạn cần đăng nhập tài khoản để sử dụng dịch vụ sinh sticker AI
            </p>
          )}

          <button
            type="button"
            onClick={handleGenerateClick}
            disabled={
              isGenerating
              || isCheckingFace
              || (isAuthenticated && (!file || !previewUrl || !isFaceVerified))
            }
            className="btn-primary"
            style={{
              padding: '16px 40px',
              fontSize: '1.1rem',
              width: '100%',
              maxWidth: '380px',
              justifyContent: 'center'
            }}
          >
            {isCheckingFace ? (
              <>
                <Loader2 size={22} className="animate-spin-slow" />
                <span>Đang Kiểm Tra Khuôn Mặt</span>
              </>
            ) : isAuthenticated ? (
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
