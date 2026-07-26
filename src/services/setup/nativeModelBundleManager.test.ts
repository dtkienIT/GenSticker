import { describe, expect, test, vi } from 'vitest';
import { NativeModelBundleManager } from './nativeModelBundleManager';
import type { ModelBundleState, ModelDownloadProgress } from './types';

describe('NativeModelBundleManager', () => {
  test('reports byte-level download progress and terminal readiness', async () => {
    const listeners = new Set<(event: ModelDownloadProgress) => void>();
    const bridge = {
      getModelBundleState: vi.fn().mockResolvedValue({
        status: 'missing',
        modelId: 'lcm-sd15-chibi',
        modelVersion: '1.0.0',
        downloadedBytes: 0,
        totalBytes: 100,
      }),
      startModelDownload: vi.fn(async (): Promise<ModelBundleState> => {
        listeners.forEach((listener) =>
          listener({ phase: 'downloading', downloadedBytes: 50, totalBytes: 100 }),
        );
        return {
          status: 'ready',
          modelId: 'lcm-sd15-chibi',
          modelVersion: '1.0.0',
          downloadedBytes: 100,
          totalBytes: 100,
        };
      }),
      installLocalModel: vi.fn(),
      cancelModelDownload: vi.fn(),
      addModelDownloadProgressListener: (listener: (event: ModelDownloadProgress) => void) => {
        listeners.add(listener);
        return { remove: () => listeners.delete(listener) };
      },
    };
    const progress = vi.fn();
    const manager = new NativeModelBundleManager(bridge);

    const ready = await manager.start(progress);

    expect(progress).toHaveBeenCalledWith(
      expect.objectContaining({ downloadedBytes: 50, totalBytes: 100 }),
    );
    expect(ready.status).toBe('ready');
  });

  test('reports verification progress while installing a staged local model', async () => {
    const listeners = new Set<(event: ModelDownloadProgress) => void>();
    const bridge = {
      getModelBundleState: vi.fn(),
      startModelDownload: vi.fn(),
      installLocalModel: vi.fn(async (): Promise<ModelBundleState> => {
        listeners.forEach((listener) =>
          listener({ phase: 'verifying', downloadedBytes: 100, totalBytes: 100 }),
        );
        return {
          status: 'ready',
          modelId: 'lcm-sd15-chibi',
          modelVersion: '1.0.0',
          downloadedBytes: 100,
          totalBytes: 100,
        };
      }),
      cancelModelDownload: vi.fn(),
      addModelDownloadProgressListener: (listener: (event: ModelDownloadProgress) => void) => {
        listeners.add(listener);
        return { remove: () => listeners.delete(listener) };
      },
    };
    const progress = vi.fn();
    const manager = new NativeModelBundleManager(bridge);

    const ready = await manager.installLocal(progress);

    expect(bridge.installLocalModel).toHaveBeenCalledOnce();
    expect(progress).toHaveBeenCalledWith(
      expect.objectContaining({ phase: 'verifying', downloadedBytes: 100 }),
    );
    expect(ready.status).toBe('ready');
  });
});
