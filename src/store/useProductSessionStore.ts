import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import type { ConsentState } from '@/services/contracts';

export type StickerServiceMode = 'mock' | 'http';

export const PRODUCT_SESSION_STORAGE_KEY = '@gensticker/product-session/v1';
export const CURRENT_CONSENT_VERSION = '1.0';

export const EMPTY_CONSENT_STATE: ConsentState = {
  consentVersion: CURRENT_CONSENT_VERSION,
  accepted: false,
  reuseOptIn: false,
  acceptedAt: null,
};

const staticRenderStorage: StateStorage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

const sessionStorage = createJSONStorage(() =>
  typeof window === 'undefined' ? staticRenderStorage : AsyncStorage,
);

interface ProductSessionData {
  activeCharacterId: string | null;
  activeJobId: string | null;
  activePackId: string | null;
  consentState: ConsentState;
  selectedServiceMode: StickerServiceMode;
}

interface ProductSessionRuntimeState {
  hasHydrated: boolean;
  isHydrating: boolean;
  isResuming: boolean;
  hasAttemptedResume: boolean;
  hydrationError: string | null;
}

interface ProductSessionActions {
  setActiveCharacterId: (characterId: string | null) => void;
  setActiveJobId: (jobId: string | null) => void;
  setActivePackId: (packId: string | null) => void;
  setActiveFlow: (
    activeFlow: Partial<
      Pick<ProductSessionData, 'activeCharacterId' | 'activeJobId' | 'activePackId'>
    >,
  ) => void;
  clearActiveFlow: () => void;
  setConsentState: (consentState: ConsentState) => void;
  clearConsent: () => void;
  setSelectedServiceMode: (serviceMode: StickerServiceMode) => void;
  beginResume: () => void;
  finishResume: () => void;
  resetResumeState: () => void;
  markHydrationStarted: () => void;
  markHydrationFinished: (error?: unknown) => void;
  resetProductSession: () => void;
}

export type ProductSessionState = ProductSessionData &
  ProductSessionRuntimeState &
  ProductSessionActions;

const defaultServiceMode: StickerServiceMode =
  process.env.EXPO_PUBLIC_STICKER_SERVICE === 'http' ? 'http' : 'mock';

const initialSessionData: ProductSessionData = {
  activeCharacterId: null,
  activeJobId: null,
  activePackId: null,
  consentState: EMPTY_CONSENT_STATE,
  selectedServiceMode: defaultServiceMode,
};

const initialRuntimeState: ProductSessionRuntimeState = {
  hasHydrated: false,
  isHydrating: true,
  isResuming: false,
  hasAttemptedResume: false,
  hydrationError: null,
};

function getHydrationErrorMessage(error: unknown): string | null {
  return error == null ? null : 'storage_read_failed';
}

export const useProductSessionStore = create<ProductSessionState>()(
  persist(
    (set) => ({
      ...initialSessionData,
      ...initialRuntimeState,
      setActiveCharacterId: (activeCharacterId) => set({ activeCharacterId }),
      setActiveJobId: (activeJobId) => set({ activeJobId }),
      setActivePackId: (activePackId) => set({ activePackId }),
      setActiveFlow: (activeFlow) => set(activeFlow),
      clearActiveFlow: () =>
        set({
          activeCharacterId: null,
          activeJobId: null,
          activePackId: null,
          isResuming: false,
          hasAttemptedResume: false,
        }),
      setConsentState: (consentState) => set({ consentState }),
      clearConsent: () => set({ consentState: { ...EMPTY_CONSENT_STATE } }),
      setSelectedServiceMode: (selectedServiceMode) => set({ selectedServiceMode }),
      beginResume: () => set({ isResuming: true, hasAttemptedResume: true }),
      finishResume: () => set({ isResuming: false }),
      resetResumeState: () => set({ isResuming: false, hasAttemptedResume: false }),
      markHydrationStarted: () =>
        set({ hasHydrated: false, isHydrating: true, hydrationError: null }),
      markHydrationFinished: (error) =>
        set({
          hasHydrated: true,
          isHydrating: false,
          hydrationError: getHydrationErrorMessage(error),
        }),
      resetProductSession: () =>
        set({
          ...initialSessionData,
          isResuming: false,
          hasAttemptedResume: false,
          hydrationError: null,
        }),
    }),
    {
      name: PRODUCT_SESSION_STORAGE_KEY,
      version: 2,
      storage: sessionStorage,
      migrate: (persistedState) => {
        const state = persistedState as Partial<ProductSessionData>;
        const consentState = state.consentState;

        return {
          ...initialSessionData,
          ...state,
          consentState:
            consentState?.consentVersion === CURRENT_CONSENT_VERSION
              ? consentState
              : { ...EMPTY_CONSENT_STATE },
        };
      },
      partialize: (state) => ({
        activeCharacterId: state.activeCharacterId,
        activeJobId: state.activeJobId,
        activePackId: state.activePackId,
        consentState: state.consentState,
        selectedServiceMode: state.selectedServiceMode,
      }),
      onRehydrateStorage: (state) => {
        return (rehydratedState, error) => {
          (rehydratedState ?? state).markHydrationFinished(error);
        };
      },
    },
  ),
);
