import { create } from 'zustand';
import {
  GeneratedSticker,
  GenerationProgress,
  StickerGenerationRequest,
  StickerJobStatus,
} from '../types/sticker';

interface StickerState {
  // State
  draftRequest: StickerGenerationRequest | null;
  jobStatus: StickerJobStatus;
  progress: GenerationProgress;
  currentResult: GeneratedSticker | null;
  savedStickers: GeneratedSticker[];
  errorMessage: string | null;

  // Actions
  setDraft: (request: StickerGenerationRequest) => void;
  startGeneration: () => void;
  updateProgress: (progress: GenerationProgress) => void;
  completeGeneration: (result: GeneratedSticker) => void;
  failGeneration: (error: string) => void;
  saveSticker: (sticker: GeneratedSticker) => void;
  removeSticker: (id: string) => void;
  resetGeneration: () => void;
}

export const useStickerStore = create<StickerState>((set) => ({
  draftRequest: null,
  jobStatus: 'idle',
  progress: { step: 'Ready', progressPercent: 0 },
  currentResult: null,
  savedStickers: [],
  errorMessage: null,

  setDraft: (request) =>
    set({
      draftRequest: request,
      errorMessage: null,
    }),

  startGeneration: () =>
    set({
      jobStatus: 'processing',
      progress: { step: 'Preparing prompt...', progressPercent: 10 },
      errorMessage: null,
    }),

  updateProgress: (progress) =>
    set({
      progress,
    }),

  completeGeneration: (result) =>
    set({
      jobStatus: 'completed',
      currentResult: result,
      progress: { step: 'Complete!', progressPercent: 100 },
    }),

  failGeneration: (error) =>
    set({
      jobStatus: 'failed',
      errorMessage: error,
    }),

  saveSticker: (sticker) =>
    set((state) => {
      // Avoid duplicate saves
      if (state.savedStickers.some((s) => s.id === sticker.id)) {
        return state;
      }
      return {
        savedStickers: [sticker, ...state.savedStickers],
      };
    }),

  removeSticker: (id) =>
    set((state) => ({
      savedStickers: state.savedStickers.filter((s) => s.id !== id),
    })),

  resetGeneration: () =>
    set({
      draftRequest: null,
      jobStatus: 'idle',
      progress: { step: 'Ready', progressPercent: 0 },
      currentResult: null,
      errorMessage: null,
    }),
}));
