import { useState, useCallback, useEffect } from 'react';
import confetti from 'canvas-confetti';
import type { GenerationState, StickerStyleId, ProcessStep, StickerItem } from '../types/sticker';
import { INITIAL_PIPELINE_STEPS } from '../mock/mockStickers';
import { StickerGenerationError, StickerService } from '../services/stickerService';

const createProcessingSteps = (): ProcessStep[] => INITIAL_PIPELINE_STEPS.map((step, index) => ({
  ...step,
  status: index === 0 ? 'processing' : 'idle',
}));

export function useStickerGenerator() {
  const [state, setState] = useState<GenerationState>({
    jobId: null,
    status: 'idle',
    originalImage: null,
    originalFileName: null,
    selectedStyle: '3d-chibi',
    currentStepIndex: 0,
    overallProgress: 0,
    steps: INITIAL_PIPELINE_STEPS,
    stickers: [],
    errorMessage: null,
    previewImageUrl: null,
    previewImageUrls: [],
    qualityStatus: null,
  });

  const setSelectedStyle = useCallback((styleId: StickerStyleId) => {
    setState((prev) => ({ ...prev, selectedStyle: styleId }));
  }, []);

  const applyProgress = useCallback((stepIdx: number, step: ProcessStep, overallProgress: number) => {
    setState((prev) => {
      const newSteps = [...prev.steps];
      newSteps[stepIdx] = { ...step };
      return {
        ...prev,
        currentStepIndex: stepIdx,
        overallProgress,
        steps: newSteps,
      };
    });
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
      steps: createProcessingSteps(),
      errorMessage: null,
      previewImageUrl: null,
      previewImageUrls: [],
      qualityStatus: null,
    }));

    try {
      const result = await StickerService.generateStickers({
        imageFile,
        styleId: state.selectedStyle,
        onStepProgress: applyProgress,
      });

      setState((prev) => ({
        ...prev,
        status: 'completed',
        overallProgress: 100,
        stickers: result.stickers,
        previewImageUrls: result.previewImageUrls,
        previewImageUrl: result.previewImageUrls.at(-1) || null,
        qualityStatus: 'accepted',
        jobId: null,
      }));

      triggerConfetti();
    } catch (err: unknown) {
      console.error('Generation error:', err);
      const message = err instanceof Error ? err.message : 'Có lỗi xảy ra trong quá trình sinh sticker. Vui lòng thử lại!';
      setState((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: message,
        previewImageUrl: err instanceof StickerGenerationError ? err.previewImageUrl : null,
        previewImageUrls: err instanceof StickerGenerationError ? err.previewImageUrls : [],
        qualityStatus: err instanceof StickerGenerationError ? err.qualityStatus : null,
        jobId: err instanceof StickerGenerationError ? err.jobId : null,
      }));
    }
  }, [applyProgress, state.selectedStyle]);

  const loadStickerPack = useCallback((stickers: StickerItem[]) => {
    setState((prev) => ({
      ...prev,
      status: 'completed',
      stickers: stickers,
      overallProgress: 100,
    }));
  }, []);

  const retryGeneration = useCallback(async () => {
    if (!state.jobId) return;
    setState((prev) => ({ ...prev, status: 'processing', errorMessage: null }));
    try {
      const result = await StickerService.retryJob(
        state.jobId,
        state.selectedStyle,
        applyProgress,
      );
      setState((prev) => ({
        ...prev,
        status: 'completed',
        overallProgress: 100,
        stickers: result.stickers,
        previewImageUrls: result.previewImageUrls,
        previewImageUrl: result.previewImageUrls.at(-1) || null,
        qualityStatus: 'accepted',
        jobId: null,
      }));
      triggerConfetti();
    } catch (err: unknown) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: err instanceof Error ? err.message : 'Retry failed.',
        previewImageUrl: err instanceof StickerGenerationError ? err.previewImageUrl : prev.previewImageUrl,
        previewImageUrls: err instanceof StickerGenerationError ? err.previewImageUrls : prev.previewImageUrls,
        qualityStatus: err instanceof StickerGenerationError ? err.qualityStatus : prev.qualityStatus,
        jobId: err instanceof StickerGenerationError ? err.jobId : prev.jobId,
      }));
    }
  }, [applyProgress, state.jobId, state.selectedStyle]);

  useEffect(() => {
    let active = true;
    StickerService.resumeActiveJob(state.selectedStyle).then((result) => {
      if (!active || !result) return;
      setState((prev) => ({
        ...prev,
        status: 'completed',
        overallProgress: 100,
        stickers: result.stickers,
        previewImageUrls: result.previewImageUrls,
        previewImageUrl: result.previewImageUrls.at(-1) || null,
        qualityStatus: 'accepted',
        jobId: null,
      }));
    }).catch((err: unknown) => {
      if (!active || !(err instanceof StickerGenerationError)) return;
      setState((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: err.message,
        previewImageUrl: err.previewImageUrl,
        previewImageUrls: err.previewImageUrls,
        qualityStatus: err.qualityStatus,
        jobId: err.jobId,
      }));
    });
    return () => { active = false; };
  }, [state.selectedStyle]);

  const resetGenerator = useCallback(() => {
    StickerService.clearActiveJob();
    setState({
      jobId: null,
      status: 'idle',
      originalImage: null,
      originalFileName: null,
      selectedStyle: '3d-chibi',
      currentStepIndex: 0,
      overallProgress: 0,
      steps: INITIAL_PIPELINE_STEPS,
      stickers: [],
      errorMessage: null,
      previewImageUrl: null,
      previewImageUrls: [],
      qualityStatus: null,
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
    retryGeneration,
    resetGenerator,
    toggleFavorite,
  };
}
