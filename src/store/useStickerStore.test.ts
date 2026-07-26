import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { ModelBundleState, ModelDownloadProgress } from '@/services/setup/types';

const mocks = vi.hoisted(() => ({
  installLocal: vi.fn(),
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
  },
}));

import { useStickerStore } from './useStickerStore';

describe('useStickerStore local model setup', () => {
  beforeEach(() => {
    mocks.installLocal.mockReset();
    useStickerStore.setState({
      modelBundleState: null,
      modelDownloadProgress: null,
      capabilityStatus: 'checking',
      capability: null,
      error: null,
    });
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
