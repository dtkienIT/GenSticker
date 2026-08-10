import { useCallback, useRef, useState } from 'react';
import { detectFaceCount } from '../services/faceDetectionService';

export type FaceCheckStatus = 'idle' | 'checking' | 'verified';

export interface UseImageUploadReturn {
  file: File | null;
  previewUrl: string | null;
  error: string | null;
  isDragging: boolean;
  faceCheckStatus: FaceCheckStatus;
  pendingFileName: string | null;
  handleFileSelect: (selectedFile: File) => Promise<boolean>;
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  clearImage: () => void;
}

const MAX_FILE_SIZE_MB = 15;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('preview_read_failed'));
    reader.readAsDataURL(file);
  });
}

export function useImageUpload(): UseImageUploadReturn {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [faceCheckStatus, setFaceCheckStatus] = useState<FaceCheckStatus>('idle');
  const [pendingFileName, setPendingFileName] = useState<string | null>(null);
  const latestRequestRef = useRef(0);

  const validateAndProcessFile = useCallback(async (selectedFile: File): Promise<boolean> => {
    const requestId = ++latestRequestRef.current;
    setError(null);
    setFile(null);
    setPreviewUrl(null);
    setPendingFileName(null);
    setFaceCheckStatus('idle');

    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      setError('Định dạng file không được hỗ trợ. Vui lòng chọn file PNG, JPG hoặc WEBP.');
      return false;
    }

    if (selectedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`Dung lượng file vượt quá giới hạn ${MAX_FILE_SIZE_MB}MB.`);
      return false;
    }

    setPendingFileName(selectedFile.name);
    setFaceCheckStatus('checking');

    try {
      const faceCount = await detectFaceCount(selectedFile);
      if (requestId !== latestRequestRef.current) return false;

      if (faceCount === 0) {
        setError('Không tìm thấy khuôn mặt. Hãy chọn ảnh chân dung có đúng một khuôn mặt rõ ràng và đủ ánh sáng.');
        setPendingFileName(null);
        setFaceCheckStatus('idle');
        return false;
      }

      if (faceCount > 1) {
        setError(`Phát hiện ${faceCount} khuôn mặt. Hãy chọn ảnh chỉ có đúng một khuôn mặt được phát hiện.`);
        setPendingFileName(null);
        setFaceCheckStatus('idle');
        return false;
      }

      const nextPreviewUrl = await readFileAsDataUrl(selectedFile);
      if (requestId !== latestRequestRef.current) return false;

      setFile(selectedFile);
      setPreviewUrl(nextPreviewUrl);
      setPendingFileName(null);
      setFaceCheckStatus('verified');
      return true;
    } catch (faceDetectionError) {
      if (requestId !== latestRequestRef.current) return false;

      console.error('Face detection failed:', faceDetectionError);
      setError('Không thể kiểm tra khuôn mặt trên thiết bị này. Vui lòng tải lại trang và thử lại.');
      setPendingFileName(null);
      setFaceCheckStatus('idle');
      return false;
    }
  }, []);

  const handleFileSelect = useCallback((selectedFile: File): Promise<boolean> => {
    return validateAndProcessFile(selectedFile);
  }, [validateAndProcessFile]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      void validateAndProcessFile(droppedFile);
    }
  }, [validateAndProcessFile]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const clearImage = useCallback(() => {
    latestRequestRef.current += 1;
    setFile(null);
    setPreviewUrl(null);
    setError(null);
    setPendingFileName(null);
    setFaceCheckStatus('idle');
  }, []);

  return {
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
  };
}
