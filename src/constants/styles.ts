import type { StylePresetId } from '@/services/generation/types';

export interface StickerStyleOption {
  id: StylePresetId;
  name: string;
  description: string;
  emoji: string;
  previewColor: string;
}

export const STICKER_STYLES: StickerStyleOption[] = [
  {
    id: 'chibi',
    name: 'Chibi',
    description: 'Cute, expressive proportions',
    emoji: '🌟',
    previewColor: '#FF6B6B',
  },
  {
    id: 'cartoon',
    name: 'Cartoon',
    description: 'Bold classic animation',
    emoji: '🎨',
    previewColor: '#4D96FF',
  },
  {
    id: 'three-d',
    name: '3D Toy',
    description: 'Soft, rounded toy rendering',
    emoji: '🤖',
    previewColor: '#8B5CF6',
  },
  {
    id: 'meme',
    name: 'Meme',
    description: 'Big reaction energy',
    emoji: '😎',
    previewColor: '#F59E0B',
  },
];
