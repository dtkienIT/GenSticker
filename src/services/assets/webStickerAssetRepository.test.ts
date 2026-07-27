import 'fake-indexeddb/auto';
import { deleteDB } from 'idb';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CONTRACT_VERSION, type GenerationRequest } from '../generation/types';
import { WebStickerAssetRepository } from './webStickerAssetRepository';

const databaseNames: string[] = [];
const repositories: WebStickerAssetRepository[] = [];
const request: GenerationRequest = {
  contractVersion: CONTRACT_VERSION,
  requestId: 'request-1',
  prompt: 'A happy cat',
  stylePresetId: 'chibi',
  seed: 42,
  outputWidth: 512,
  outputHeight: 512,
};

function repository(name: string, createObjectUrl = vi.fn(() => `blob:${Math.random()}`)) {
  databaseNames.push(name);
  const instance = new WebStickerAssetRepository({
    databaseName: name,
    fetch: vi.fn(async () => new Response(new Blob(['png'], { type: 'image/png' }))),
    createObjectUrl,
    revokeObjectUrl: vi.fn(),
    createAssetId: () => 'asset-1',
    now: () => '2026-07-27T00:00:00.000Z',
  });
  repositories.push(instance);
  return instance;
}

afterEach(async () => {
  await Promise.all(repositories.splice(0).map((instance) => instance.close()));
  await Promise.all([...new Set(databaseNames.splice(0))].map((name) => deleteDB(name)));
});

describe('WebStickerAssetRepository', () => {
  it('persists PNG bytes across repository instances', async () => {
    const name = `stickers-${crypto.randomUUID()}`;
    const first = repository(name);
    await first.persist(
      {
        requestId: request.requestId,
        localUri: 'blob:temporary',
        mimeType: 'image/png',
        width: 512,
        height: 512,
        adapterId: 'webgpu',
        temporary: true,
      },
      request,
    );
    const createObjectUrl = vi.fn(() => 'blob:restored');
    const second = repository(name, createObjectUrl);

    await expect(second.list()).resolves.toEqual([
      expect.objectContaining({ assetId: 'asset-1', localUri: 'blob:restored' }),
    ]);
    expect(createObjectUrl).toHaveBeenCalledWith(expect.any(Blob));
  });

  it('deduplicates persistence by request ID and deletes the record', async () => {
    const name = `stickers-${crypto.randomUUID()}`;
    const instance = repository(name);
    const output = {
      requestId: request.requestId,
      localUri: 'blob:temporary',
      mimeType: 'image/png' as const,
      width: 512,
      height: 512,
      adapterId: 'webgpu',
      temporary: true,
    };
    const first = await instance.persist(output, request);
    const second = await instance.persist(output, request);

    expect(second.assetId).toBe(first.assetId);
    await instance.delete(first.assetId);
    await expect(instance.list()).resolves.toEqual([]);
  });
});
