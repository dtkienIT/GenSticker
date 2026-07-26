import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { stickerServices } from '@/services/appServices';
import type { GallerySticker } from '@/services/assets/types';
import {
  presentStickerError,
  type StickerErrorPresentation,
} from '@/services/errors/generationErrorPresentation';
import type { ExportResult } from '@/services/export/types';
import {
  GenerationFailure,
  type DeviceCapabilityResult,
  type GenerationProgressEvent,
  type StylePresetId,
} from '@/services/generation/types';
import type { ModelBundleState, ModelDownloadProgress } from '@/services/setup/types';

export interface StickerDraft {
  prompt: string;
  stylePresetId: StylePresetId;
}

type CapabilityStatus = 'checking' | 'ready' | 'unsupported' | 'failed';
type JobStatus = 'idle' | 'processing' | 'completed' | 'failed' | 'cancelled';

interface StickerState {
  initialized: boolean;
  hasHydrated: boolean;
  capabilityStatus: CapabilityStatus;
  capability: DeviceCapabilityResult | null;
  modelBundleState: ModelBundleState | null;
  modelDownloadProgress: ModelDownloadProgress | null;
  draft: StickerDraft;
  jobStatus: JobStatus;
  progress: GenerationProgressEvent | null;
  error: StickerErrorPresentation | null;
  gallery: GallerySticker[];
  currentAssetId: string | null;
  currentAsset: GallerySticker | null;
  retryKey: string | null;
  retryCount: number;
  initialize: () => Promise<void>;
  checkCapabilities: () => Promise<void>;
  refreshModelBundle: () => Promise<void>;
  downloadModel: () => Promise<void>;
  installLocalModel: () => Promise<void>;
  cancelModelDownload: () => Promise<void>;
  updateDraft: (draft: Partial<StickerDraft>) => void;
  runGeneration: () => Promise<GallerySticker | null>;
  cancelGeneration: () => Promise<void>;
  editPrompt: () => void;
  selectAsset: (assetId: string) => Promise<GallerySticker | null>;
  deleteAsset: (assetId: string) => Promise<void>;
  saveCurrentToPhotos: () => Promise<ExportResult>;
  shareCurrent: () => Promise<ExportResult>;
}

function attemptKey(draft: StickerDraft): string {
  return `${draft.prompt.trim().toLocaleLowerCase()}::${draft.stylePresetId}`;
}

export const useStickerStore = create<StickerState>()(
  persist(
    (set, get) => ({
      initialized: false,
      hasHydrated: false,
      capabilityStatus: 'checking',
      capability: null,
      modelBundleState: null,
      modelDownloadProgress: null,
      draft: { prompt: '', stylePresetId: 'chibi' },
      jobStatus: 'idle',
      progress: null,
      error: null,
      gallery: [],
      currentAssetId: null,
      currentAsset: null,
      retryKey: null,
      retryCount: 0,

      initialize: async () => {
        if (get().initialized) return;
        set({ initialized: true });
        const gallery = await stickerServices.repository.list();
        const currentAsset = gallery.find((item) => item.assetId === get().currentAssetId) ?? null;
        set({ gallery, currentAsset, currentAssetId: currentAsset?.assetId ?? null });
        await get().refreshModelBundle();
        await get().checkCapabilities();
      },

      refreshModelBundle: async () => {
        const modelBundleState = await stickerServices.modelBundle.getState();
        set({ modelBundleState });
      },

      downloadModel: async () => {
        set({ modelDownloadProgress: null, error: null });
        const modelBundleState = await stickerServices.modelBundle.start((modelDownloadProgress) =>
          set({ modelDownloadProgress }),
        );
        set({ modelBundleState, modelDownloadProgress: null });
        if (modelBundleState.status === 'ready') await get().checkCapabilities();
      },

      installLocalModel: async () => {
        set({ modelDownloadProgress: null, error: null });
        const modelBundleState = await stickerServices.modelBundle.installLocal(
          (modelDownloadProgress) => set({ modelDownloadProgress }),
        );
        set({ modelBundleState, modelDownloadProgress: null });
        if (modelBundleState.status === 'ready') await get().checkCapabilities();
      },

      cancelModelDownload: async () => {
        const modelBundleState = await stickerServices.modelBundle.cancel();
        set({ modelBundleState, modelDownloadProgress: null });
      },

      checkCapabilities: async () => {
        set({ capabilityStatus: 'checking', capability: null, error: null });
        try {
          const capability = await stickerServices.generator.getCapabilities();
          if (capability.supported) {
            set({ capabilityStatus: 'ready', capability });
          } else {
            set({
              capabilityStatus: 'unsupported',
              capability,
              error: presentStickerError(new GenerationFailure(capability.reasonCode)),
            });
          }
        } catch (error) {
          set({ capabilityStatus: 'failed', error: presentStickerError(error) });
        }
      },

      updateDraft: (draft) => set((state) => ({ draft: { ...state.draft, ...draft } })),

      runGeneration: async () => {
        const draft = get().draft;
        const key = attemptKey(draft);
        const retryCount = get().retryKey === key ? get().retryCount + 1 : 1;
        set({
          retryKey: key,
          retryCount,
          jobStatus: 'processing',
          progress: null,
          error: null,
        });
        try {
          const item = await stickerServices.coordinator.run(draft, (progress) =>
            set({ progress }),
          );
          const gallery = await stickerServices.repository.list();
          set({
            gallery,
            currentAssetId: item.assetId,
            currentAsset: item,
            jobStatus: 'completed',
            progress: { requestId: item.requestId, stage: 'saving', progressPercent: 100 },
          });
          return item;
        } catch (error) {
          const presentation = presentStickerError(error);
          set({
            jobStatus:
              error instanceof GenerationFailure && error.code === 'GENERATION_CANCELLED'
                ? 'cancelled'
                : 'failed',
            error: presentation,
          });
          return null;
        }
      },

      cancelGeneration: async () => {
        const result = await stickerServices.coordinator.cancel();
        if (result.accepted) set({ jobStatus: 'cancelled', error: null });
      },

      editPrompt: () => set({ jobStatus: 'idle', progress: null, error: null }),

      selectAsset: async (assetId) => {
        const currentAsset = await stickerServices.repository.get(assetId);
        set({ currentAsset, currentAssetId: currentAsset?.assetId ?? null });
        return currentAsset;
      },

      deleteAsset: async (assetId) => {
        await stickerServices.repository.delete(assetId);
        const gallery = await stickerServices.repository.list();
        set((state) => ({
          gallery,
          currentAsset: state.currentAsset?.assetId === assetId ? null : state.currentAsset,
          currentAssetId: state.currentAssetId === assetId ? null : state.currentAssetId,
        }));
      },

      saveCurrentToPhotos: async () => {
        const current = get().currentAsset;
        return current
          ? stickerServices.exporter.saveToPhotoLibrary(current.localUri)
          : { status: 'failed', code: 'SAVE_FAILED' };
      },

      shareCurrent: async () => {
        const current = get().currentAsset;
        return current
          ? stickerServices.exporter.share(current.localUri)
          : { status: 'failed', code: 'SHARE_FAILED' };
      },
    }),
    {
      name: '@gensticker/session/v2',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        draft: state.draft,
        currentAssetId: state.currentAssetId,
        retryKey: state.retryKey,
        retryCount: state.retryCount,
      }),
      onRehydrateStorage: () => () => useStickerStore.setState({ hasHydrated: true }),
    },
  ),
);
