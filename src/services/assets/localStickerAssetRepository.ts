import { GenerationFailure } from '../generation/types';
import type { GeneratedOutput, GenerationRequest } from '../generation/types';
import type {
  GalleryMetadataStorage,
  GallerySticker,
  StickerAssetRepository,
  StickerFileStore,
} from './types';

interface LocalRepositoryOptions {
  assetRootUri: string;
  files: StickerFileStore;
  metadata: GalleryMetadataStorage;
  createAssetId: () => string;
  now: () => string;
  shouldFailWrites?: () => boolean;
}

export class LocalStickerAssetRepository implements StickerAssetRepository {
  private readonly assetRootUri: string;

  constructor(private readonly options: LocalRepositoryOptions) {
    this.assetRootUri = options.assetRootUri.replace(/\/$/, '');
  }

  async persist(output: GeneratedOutput, request: GenerationRequest): Promise<GallerySticker> {
    if (output.requestId !== request.requestId || this.options.shouldFailWrites?.()) {
      throw new GenerationFailure('ASSET_STORAGE_FAILED');
    }

    const current = await this.list();
    const existing = current.find((item) => item.requestId === request.requestId);
    if (existing) return existing;

    const assetId = this.options.createAssetId();
    const localUri = `${this.assetRootUri}/${assetId}.png`;
    const item: GallerySticker = {
      assetId,
      requestId: request.requestId,
      localUri,
      prompt: request.prompt,
      stylePresetId: request.stylePresetId,
      createdAt: this.options.now(),
      mimeType: 'image/png',
      width: output.width,
      height: output.height,
    };

    try {
      await this.options.files.copy(output.localUri, localUri);
      await this.options.metadata.save([item, ...current]);
      return item;
    } catch (error) {
      try {
        if (await this.options.files.exists(localUri)) {
          await this.options.files.delete(localUri);
        }
      } catch {
        // Best-effort rollback; the gallery record was never committed.
      }
      if (error instanceof GenerationFailure) throw error;
      throw new GenerationFailure('ASSET_STORAGE_FAILED');
    }
  }

  async list(): Promise<GallerySticker[]> {
    const items = await this.options.metadata.load();
    const existing: GallerySticker[] = [];
    for (const item of items) {
      if (this.isOwned(item.localUri) && (await this.options.files.exists(item.localUri))) {
        existing.push(item);
      }
    }
    if (existing.length !== items.length) {
      await this.options.metadata.save(existing);
    }
    return existing;
  }

  async get(assetId: string): Promise<GallerySticker | null> {
    return (await this.list()).find((item) => item.assetId === assetId) ?? null;
  }

  async delete(assetId: string): Promise<void> {
    const items = await this.options.metadata.load();
    const item = items.find((candidate) => candidate.assetId === assetId);
    if (!item) return;
    if (!this.isOwned(item.localUri)) {
      throw new GenerationFailure('ASSET_STORAGE_FAILED');
    }
    if (await this.options.files.exists(item.localUri)) {
      await this.options.files.delete(item.localUri);
    }
    await this.options.metadata.save(items.filter((candidate) => candidate.assetId !== assetId));
  }

  private isOwned(uri: string): boolean {
    return uri.startsWith(`${this.assetRootUri}/`);
  }
}
