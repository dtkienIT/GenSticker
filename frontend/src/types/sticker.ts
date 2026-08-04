export type StickerStyleId = 
  | '3d-chibi' 
  | 'anime-kawaii' 
  | 'cyberpunk' 
  | 'pixel-art' 
  | 'doodle-cartoon' 
  | 'vector-flat' 
  | 'neon-glow'
  | 'vintage-retro';

export interface StickerStyle {
  id: StickerStyleId;
  name: string;
  description: string;
  badge: string;
  previewUrl: string;
  popular?: boolean;
}

export interface StickerItem {
  id: string;
  title: string;
  imageUrl: string;
  style: StickerStyleId;
  styleName: string;
  tags: string[];
  emotion: string;
  likes: number;
  isFavorite?: boolean;
  sizeKb: number;
  dimensions: string;
}

export type StepStatus = 'idle' | 'processing' | 'completed' | 'error';

export interface ProcessStep {
  id: string;
  title: string;
  description: string;
  status: StepStatus;
  progress: number; // 0 to 100
  estimatedTimeSec: number;
}

export type PipelineStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';

export interface GenerationState {
  status: PipelineStatus;
  originalImage: string | null;
  originalFileName: string | null;
  selectedStyle: StickerStyleId;
  currentStepIndex: number;
  overallProgress: number; // 0 to 100
  steps: ProcessStep[];
  stickers: StickerItem[];
  errorMessage: string | null;
}
