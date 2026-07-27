import {
  GenerationFailure,
  type GeneratedOutput,
  type GenerationRequest,
} from '../generation/types';
import { openWebDatabase, type StoredSticker } from '../storage/webDatabase';
import type { GallerySticker, StickerAssetRepository } from './types';

interface WebStickerRepositoryDependencies {
  databaseName?: string;
  fetch?: typeof fetch;
  createObjectUrl?: (blob: Blob) => string;
  revokeObjectUrl?: (url: string) => void;
  createAssetId?: () => string;
  now?: () => string;
}

export class WebStickerAssetRepository implements StickerAssetRepository {
  private readonly objectUrls = new Map<string, string>();
  private databasePromise: ReturnType<typeof openWebDatabase> | null = null;

  constructor(private readonly dependencies: WebStickerRepositoryDependencies = {}) {}

  private async database() {
    this.databasePromise ??= openWebDatabase(this.dependencies.databaseName);
    return this.databasePromise;
  }

  private materialize(stored: StoredSticker): GallerySticker {
    const previous = this.objectUrls.get(stored.assetId);
    if (previous) {
      (this.dependencies.revokeObjectUrl ?? URL.revokeObjectURL)(previous);
    }
    const localUri = (this.dependencies.createObjectUrl ?? URL.createObjectURL)(stored.png);
    this.objectUrls.set(stored.assetId, localUri);
    const { png: _png, ...metadata } = stored;
    return { ...metadata, localUri };
  }

  async persist(output: GeneratedOutput, request: GenerationRequest): Promise<GallerySticker> {
    try {
      const database = await this.database();
      const existing = await database.getFromIndex('stickers', 'requestId', request.requestId);
      if (existing) return this.materialize(existing);

      const response = await (this.dependencies.fetch ?? fetch)(output.localUri);
      if (!response.ok) throw new Error(`PNG read failed: ${response.status}`);
      const png = await response.blob();
      if (png.type && png.type !== 'image/png') {
        throw new Error(`Expected image/png, received ${png.type}`);
      }
      const stored: StoredSticker = {
        assetId:
          this.dependencies.createAssetId?.() ??
          `sticker-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        requestId: request.requestId,
        prompt: request.prompt,
        stylePresetId: request.stylePresetId,
        createdAt: this.dependencies.now?.() ?? new Date().toISOString(),
        mimeType: 'image/png',
        width: output.width,
        height: output.height,
        png,
      };
      await database.add('stickers', stored);
      return this.materialize(stored);
    } catch (error) {
      if (error instanceof GenerationFailure) throw error;
      throw new GenerationFailure(
        'ASSET_STORAGE_FAILED',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  async list(): Promise<GallerySticker[]> {
    const database = await this.database();
    const stored = await database.getAll('stickers');
    return stored
      .sort((first, second) => second.createdAt.localeCompare(first.createdAt))
      .map((item) => this.materialize(item));
  }

  async get(assetId: string): Promise<GallerySticker | null> {
    const stored = await (await this.database()).get('stickers', assetId);
    return stored ? this.materialize(stored) : null;
  }

  async delete(assetId: string): Promise<void> {
    await (await this.database()).delete('stickers', assetId);
    const objectUrl = this.objectUrls.get(assetId);
    if (objectUrl) {
      (this.dependencies.revokeObjectUrl ?? URL.revokeObjectURL)(objectUrl);
      this.objectUrls.delete(assetId);
    }
  }

  async close(): Promise<void> {
    (await this.database()).close();
    this.databasePromise = null;
  }
}
