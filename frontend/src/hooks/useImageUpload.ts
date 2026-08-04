import { useState, useCallback } from 'react';

export interface UseImageUploadReturn {
  file: File | null;
  previewUrl: string | null;
  error: string | null;
  isDragging: boolean;
  handleFileSelect: (selectedFile: File) => boolean;
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  clearImage: () => void;
}

const MAX_FILE_SIZE_MB = 15;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'image/svg+xml'];

export function useImageUpload(): UseImageUploadReturn {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const validateAndProcessFile = useCallback((selectedFile: File): boolean => {
    setError(null);

    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      setError('Định dạng file không hỗ trợ. Vui lòng chọn file PNG, JPG hoặc WEBP.');
      return false;
    }

    if (selectedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`Dung lượng file vượt quá giới hạn ${MAX_FILE_SIZE_MB}MB.`);
      return false;
    }

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);

    return true;
  }, []);

  const handleFileSelect = useCallback((selectedFile: File): boolean => {
    return validateAndProcessFile(selectedFile);
  }, [validateAndProcessFile]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndProcessFile(droppedFile);
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
    setFile(null);
    setPreviewUrl(null);
    setError(null);
  }, []);

  return {
    file,
    previewUrl,
    error,
    isDragging,
    handleFileSelect,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    clearImage,
  };
}
