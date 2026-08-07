import { useState, useCallback } from 'react';
import confetti from 'canvas-confetti';
import type { GenerationState, StickerStyleId, ProcessStep, StickerItem } from '../types/sticker';
import { INITIAL_PIPELINE_STEPS } from '../mock/mockStickers';
import { StickerService } from '../services/stickerService';

export function useStickerGenerator() {
  const [state, setState] = useState<GenerationState>({
    status: 'idle',
    originalImage: null,
    originalFileName: null,
    selectedStyle: '3d-chibi',
    currentStepIndex: 0,
    overallProgress: 0,
    steps: INITIAL_PIPELINE_STEPS,
    stickers: [],
    errorMessage: null,
  });

  const setSelectedStyle = useCallback((styleId: StickerStyleId) => {
    setState((prev) => ({ ...prev, selectedStyle: styleId }));
  }, []);

  const triggerConfetti = () => {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b'],
    });
  };

  const startGeneration = useCallback(async (imageFile: File, previewUrl: string) => {
    setState((prev) => ({
      ...prev,
      status: 'processing',
      originalImage: previewUrl,
      originalFileName: imageFile.name,
      currentStepIndex: 0,
      overallProgress: 0,
      steps: JSON.parse(JSON.stringify(INITIAL_PIPELINE_STEPS)),
      errorMessage: null,
    }));

    try {
      const stickers = await StickerService.generateStickers({
        imageFile,
        styleId: state.selectedStyle,
        onStepProgress: (stepIdx: number, step: ProcessStep, overallProgress: number) => {
          setState((prev) => {
            const newSteps = [...prev.steps];
            newSteps[stepIdx] = { ...step };
            return {
              ...prev,
              currentStepIndex: stepIdx,
              overallProgress: overallProgress,
              steps: newSteps,
            };
          });
        },
      });

      setState((prev) => ({
        ...prev,
        status: 'completed',
        overallProgress: 100,
        stickers: stickers,
      }));

      triggerConfetti();
    } catch (err: unknown) {
      console.error('Generation error:', err);
      const message = err instanceof Error ? err.message : 'Có lỗi xảy ra trong quá trình sinh sticker. Vui lòng thử lại!';
      setState((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: message,
      }));
    }
  }, [state.selectedStyle]);

  const loadStickerPack = useCallback((stickers: StickerItem[]) => {
    setState((prev) => ({
      ...prev,
      status: 'completed',
      stickers: stickers,
      overallProgress: 100,
    }));
  }, []);

  const resetGenerator = useCallback(() => {
    setState({
      status: 'idle',
      originalImage: null,
      originalFileName: null,
      selectedStyle: '3d-chibi',
      currentStepIndex: 0,
      overallProgress: 0,
      steps: INITIAL_PIPELINE_STEPS,
      stickers: [],
      errorMessage: null,
    });
  }, []);

  const toggleFavorite = useCallback((stickerId: string) => {
    setState((prev) => ({
      ...prev,
      stickers: prev.stickers.map((item) =>
        item.id === stickerId ? { ...item, isFavorite: !item.isFavorite } : item
      ),
    }));
  }, []);

  return {
    state,
    setSelectedStyle,
    startGeneration,
    loadStickerPack,
    resetGenerator,
    toggleFavorite,
  };
}
