import type { GeneratedOutput, GenerationRequest, StylePresetId } from '../generation/types';

export interface GallerySticker {
  assetId: string;
  requestId: string;
  localUri: string;
  prompt: string;
  stylePresetId: StylePresetId;
  createdAt: string;
  mimeType: 'image/png';
  width: number;
  height: number;
}

export interface StickerFileStore {
  copy(sourceUri: string, destinationUri: string): Promise<void>;
  exists(uri: string): Promise<boolean>;
  delete(uri: string): Promise<void>;
}

export interface GalleryMetadataStorage {
  load(): Promise<GallerySticker[]>;
  save(items: GallerySticker[]): Promise<void>;
}

export interface StickerAssetRepository {
  persist(output: GeneratedOutput, request: GenerationRequest): Promise<GallerySticker>;
  list(): Promise<GallerySticker[]>;
  get(assetId: string): Promise<GallerySticker | null>;
  delete(assetId: string): Promise<void>;
}
