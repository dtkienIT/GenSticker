export type ExpressionId = 'happy' | 'laughing' | 'love' | 'sad' | 'angry' | 'surprised' | 'thumbsup' | 'sleepy';

export interface ExpressionConfig {
  id: ExpressionId;
  nameEn: string;
  nameVi: string;
  emoji: string;
  color: string;
}

export interface Sticker {
  id: string;
  expressionId: ExpressionId;
  imageBase64: string;
  selected: boolean;
}

export interface StickerPack {
  id: string;
  createdAt: string;
  stickers: Sticker[];
}

export interface ValidationResult {
  valid: boolean;
  error_code?: string;
  error_message?: string;
}

export interface GenerateResult {
  expression_id: ExpressionId;
  image_base64?: string;
  success: boolean;
  error?: string;
  filtered: boolean;
}

export type AppStep = 'landing' | 'upload' | 'generating' | 'preview' | 'tray';

export type Language = 'en' | 'vi';

export interface AnalyticsEvent {
  name: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export type ReportCategory = 'unauthorized_likeness' | 'inappropriate_content' | 'copyright_violation' | 'other';

export const EXPRESSIONS: ExpressionConfig[] = [
  { id: 'happy', nameEn: 'Happy', nameVi: 'Vui vẻ', emoji: '😊', color: '#FFD700' },
  { id: 'laughing', nameEn: 'LOL', nameVi: 'Cười to', emoji: '😂', color: '#FF8C00' },
  { id: 'love', nameEn: 'Love', nameVi: 'Đáng yêu', emoji: '😍', color: '#FF69B4' },
  { id: 'sad', nameEn: 'Sad', nameVi: 'Buồn', emoji: '😢', color: '#6495ED' },
  { id: 'angry', nameEn: 'Angry', nameVi: 'Tức giận', emoji: '😠', color: '#E74C3C' },
  { id: 'surprised', nameEn: 'Surprised', nameVi: 'Bất ngờ', emoji: '😮', color: '#9B59B6' },
  { id: 'thumbsup', nameEn: 'Thumbs Up', nameVi: 'Tuyệt vời', emoji: '👍', color: '#2ECC71' },
  { id: 'sleepy', nameEn: 'Sleepy', nameVi: 'Buồn ngủ', emoji: '😴', color: '#B39DDB' },
];
