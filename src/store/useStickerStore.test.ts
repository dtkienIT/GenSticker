import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { ModelBundleState, ModelDownloadProgress } from '@/services/setup/types';

const mocks = vi.hoisted(() => ({
  installLocal: vi.fn(),
  coordinatorRun: vi.fn(),
  repositoryList: vi.fn(),
  getCapabilities: vi.fn().mockResolvedValue({
    supported: true,
    adapterId: 'expo-sticker-runtime-onnx',
  }),
}));

vi.mock('@/services/appServices', () => ({
  stickerServices: {
    modelBundle: {
      getState: vi.fn(),
      start: vi.fn(),
      installLocal: mocks.installLocal,
      cancel: vi.fn(),
    },
    generator: {
      getCapabilities: mocks.getCapabilities,
    },
    coordinator: {
      run: mocks.coordinatorRun,
      cancel: vi.fn(),
    },
    repository: {
      list: mocks.repositoryList,
    },
  },
}));

import { useStickerStore } from './useStickerStore';

describe('useStickerStore local model setup', () => {
  beforeEach(() => {
    mocks.installLocal.mockReset();
    mocks.coordinatorRun.mockReset();
    mocks.repositoryList.mockReset();
    useStickerStore.setState({
      modelBundleState: null,
      modelDownloadProgress: null,
      capabilityStatus: 'checking',
      capability: null,
      error: null,
    });
  });

  test('keeps the refreshed gallery URL as the current generated asset', async () => {
    const stale = {
      assetId: 'sticker-1',
      requestId: 'request-1',
      prompt: 'A cheerful cat',
      stylePresetId: 'chibi' as const,
      createdAt: '2026-07-27T00:00:00.000Z',
      mimeType: 'image/png' as const,
      width: 512,
      height: 512,
      localUri: 'blob:revoked',
    };
    const refreshed = { ...stale, localUri: 'blob:active' };
    mocks.coordinatorRun.mockResolvedValue(stale);
    mocks.repositoryList.mockResolvedValue([refreshed]);
    useStickerStore.setState({
      draft: { prompt: stale.prompt, stylePresetId: 'chibi' },
      gallery: [],
      currentAsset: null,
      currentAssetId: null,
      jobStatus: 'idle',
    });

    await expect(useStickerStore.getState().runGeneration()).resolves.toEqual(refreshed);
    expect(useStickerStore.getState().currentAsset).toEqual(refreshed);
  });

  test('installs staged model with verification progress and refreshes capabilities', async () => {
    const ready: ModelBundleState = {
      status: 'ready',
      modelId: 'lcm-sd15-chibi',
      modelVersion: '1.0.0',
      downloadedBytes: 100,
      totalBytes: 100,
    };
    mocks.installLocal.mockImplementation(
      async (onProgress: (event: ModelDownloadProgress) => void) => {
        onProgress({ phase: 'verifying', downloadedBytes: 50, totalBytes: 100 });
        expect(useStickerStore.getState().modelDownloadProgress).toEqual(
          expect.objectContaining({ phase: 'verifying', downloadedBytes: 50 }),
        );
        return ready;
      },
    );

    await useStickerStore.getState().installLocalModel();

    expect(useStickerStore.getState().modelBundleState).toEqual(ready);
    expect(useStickerStore.getState().modelDownloadProgress).toBeNull();
    expect(mocks.getCapabilities).toHaveBeenCalled();
  });
});
