import React, { useEffect, useRef, useState } from 'react';
import './CameraModal.css';
import { useLanguage, t } from '../i18n/i18n';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({ isOpen, onClose, onCapture }) => {
  const { language } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 720 },
          height: { ideal: 720 }
        },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraError('Unable to access camera. Please check permissions or try choosing a file.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 640;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to Blob JPEG File
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `selfie_${Date.now()}.jpg`, { type: 'image/jpeg' });
          stopCamera();
          onCapture(file);
          onClose();
        }
      },
      'image/jpeg',
      0.90
    );
  };

  if (!isOpen) return null;

  return (
    <div className="camera-modal-overlay" onClick={onClose}>
      <div className="camera-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="camera-modal-header">
          <h3>📸 {t('upload_btn_camera', language)}</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="camera-viewfinder">
          {cameraError ? (
            <div className="camera-error">{cameraError}</div>
          ) : (
            <>
              <video ref={videoRef} autoPlay playsInline muted className="camera-video" />
              <div className="selfie-guide-overlay">
                <div className="selfie-guide-circle"></div>
                <p className="guide-text">Center your face inside the circle</p>
              </div>
            </>
          )}
        </div>

        <div className="camera-modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            {t('btn_cancel', language)}
          </button>
          {!cameraError && (
            <button className="btn-primary snap-btn" onClick={capturePhoto}>
              📸 Snap Photo
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
