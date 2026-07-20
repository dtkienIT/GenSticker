export type StickerGenerationMode = 'text' | 'selfie';

export type StickerStyle = 'chibi' | 'cartoon' | 'three-d' | 'meme';

export type StickerEmotion = 'happy' | 'angry' | 'sad' | 'love' | 'confused';

export type StickerJobStatus = 'idle' | 'pending' | 'processing' | 'completed' | 'failed';

export interface StickerGenerationRequest {
  mode: StickerGenerationMode;
  prompt?: string;
  sourceImageUri?: string;
  style: StickerStyle;
  emotion: StickerEmotion;
  stickerText?: string;
}

export interface GeneratedSticker {
  id: string;
  imageUri: string;
  mode: StickerGenerationMode;
  prompt?: string;
  sourceImageUri?: string;
  style: StickerStyle;
  emotion: StickerEmotion;
  stickerText?: string;
  createdAt: string;
}

export interface StickerStyleOption {
  id: StickerStyle;
  name: string;
  description: string;
  emoji: string;
  previewColor: string;
}

export interface StickerEmotionOption {
  id: StickerEmotion;
  name: string;
  emoji: string;
}

export interface GenerationProgress {
  step: string;
  progressPercent: number;
}
