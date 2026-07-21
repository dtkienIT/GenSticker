import { describe, expect, it } from 'vitest';
import type { GeneratedOutput, GenerationRequest } from '../generation/types';
import { GenerationFailure } from '../generation/types';
import { LocalStickerAssetRepository } from './localStickerAssetRepository';
import type { GallerySticker, GalleryMetadataStorage, StickerFileStore } from './types';

class MemoryFiles implements StickerFileStore {
  readonly files = new Set<string>();

  async copy(_sourceUri: string, destinationUri: string): Promise<void> {
    this.files.add(destinationUri);
  }

  async exists(uri: string): Promise<boolean> {
    return this.files.has(uri);
  }

  async delete(uri: string): Promise<void> {
    this.files.delete(uri);
  }
}

class MemoryMetadata implements GalleryMetadataStorage {
  items: GallerySticker[] = [];
  failNextSave = false;

  async load(): Promise<GallerySticker[]> {
    return structuredClone(this.items);
  }

  async save(items: GallerySticker[]): Promise<void> {
    if (this.failNextSave) {
      this.failNextSave = false;
      throw new Error('metadata failed');
    }
    this.items = structuredClone(items);
  }
}

const request: GenerationRequest = {
  contractVersion: '1.0',
  requestId: 'request-1',
  prompt: 'Astronaut cat',
  stylePresetId: 'chibi',
  seed: 42,
  outputWidth: 1024,
  outputHeight: 1024,
};

const output: GeneratedOutput = {
  requestId: 'request-1',
  localUri: 'file:///cache/mock.png',
  mimeType: 'image/png',
  width: 1024,
  height: 1024,
  adapterId: 'mock',
};

function repository(files = new MemoryFiles(), metadata = new MemoryMetadata()) {
  return {
    files,
    metadata,
    repository: new LocalStickerAssetRepository({
      assetRootUri: 'file:///documents/gensticker',
      files,
      metadata,
      createAssetId: () => 'asset-1',
      now: () => '2026-07-21T00:00:00.000Z',
    }),
  };
}

describe('LocalStickerAssetRepository', () => {
  it('copies successful output into app-owned storage before recording metadata', async () => {
    const setup = repository();

    const item = await setup.repository.persist(output, request);

    expect(item.localUri).toBe('file:///documents/gensticker/asset-1.png');
    expect(setup.files.files.has(item.localUri)).toBe(true);
    await expect(setup.repository.list()).resolves.toEqual([item]);
  });

  it('deduplicates an already persisted request', async () => {
    const setup = repository();
    const first = await setup.repository.persist(output, request);

    await expect(setup.repository.persist(output, request)).resolves.toEqual(first);
    expect(setup.metadata.items).toHaveLength(1);
  });

  it('removes a copied file when metadata persistence fails', async () => {
    const setup = repository();
    setup.metadata.failNextSave = true;

    await expect(setup.repository.persist(output, request)).rejects.toMatchObject({
      code: 'ASSET_STORAGE_FAILED',
    });
    expect(setup.files.files.size).toBe(0);
  });

  it('prunes gallery metadata for missing files during list', async () => {
    const setup = repository();
    await setup.repository.persist(output, request);
    setup.files.files.clear();

    await expect(setup.repository.list()).resolves.toEqual([]);
    expect(setup.metadata.items).toEqual([]);
  });

  it('rejects deletion outside the app-owned asset root', async () => {
    const setup = repository();
    setup.metadata.items = [
      {
        assetId: 'escaped',
        requestId: 'request-escaped',
        localUri: 'file:///outside/sticker.png',
        prompt: 'Prompt',
        stylePresetId: 'meme',
        createdAt: '2026-07-21T00:00:00.000Z',
        mimeType: 'image/png',
        width: 1024,
        height: 1024,
      },
    ];

    await expect(setup.repository.delete('escaped')).rejects.toEqual(
      new GenerationFailure('ASSET_STORAGE_FAILED'),
    );
  });
});
