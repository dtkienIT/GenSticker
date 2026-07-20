import { create } from 'zustand';

export interface SelfiePickerDraft {
  uri: string;
  pickerAssetId: string | null;
  fileName: string | null;
  mimeType: string | null;
  width: number;
  height: number;
  byteSize: number | null;
}

export interface SelfiePickerDraftInput {
  uri: string;
  assetId?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  width?: number;
  height?: number;
  fileSize?: number | null;
}

interface SelfieDraftState {
  selectedSelfie: SelfiePickerDraft | null;
  setSelectedSelfie: (asset: SelfiePickerDraftInput) => void;
  clearSelectedSelfie: () => void;
}

function sanitizePickerAsset(asset: SelfiePickerDraftInput): SelfiePickerDraft {
  const uri = asset.uri.trim();

  if (!uri || /^data:/i.test(uri) || /;base64,/i.test(uri)) {
    throw new Error('Selfie drafts require a local picker URI and must never contain base64 data.');
  }

  return {
    uri,
    pickerAssetId: asset.assetId ?? null,
    fileName: asset.fileName ?? null,
    mimeType: asset.mimeType ?? null,
    width: asset.width ?? 0,
    height: asset.height ?? 0,
    byteSize: asset.fileSize ?? null,
  };
}

/** In-memory picker state. Intentionally does not use Zustand persistence. */
export const useSelfieDraftStore = create<SelfieDraftState>((set) => ({
  selectedSelfie: null,
  setSelectedSelfie: (asset) => set({ selectedSelfie: sanitizePickerAsset(asset) }),
  clearSelectedSelfie: () => set({ selectedSelfie: null }),
}));
