import { describe, expect, test, vi } from 'vitest';
import {
  NativeOnDeviceStickerGenerator,
  type NativeProgressEvent,
} from './nativeOnDeviceStickerGenerator';
import { CONTRACT_VERSION, GenerationFailure, type GenerationRequest } from './types';

const request: GenerationRequest = {
  contractVersion: CONTRACT_VERSION,
  requestId: 'request-1',
  prompt: 'A cheerful cat',
  stylePresetId: 'chibi',
  seed: 7,
  outputWidth: 512,
  outputHeight: 512,
};

describe('NativeOnDeviceStickerGenerator', () => {
  test('maps ordered native progress and a successful temporary output', async () => {
    const listeners = new Set<(event: NativeProgressEvent) => void>();
    const bridge = {
      getCapabilities: vi.fn().mockResolvedValue({
        contractVersion: CONTRACT_VERSION,
        supported: true,
        reasonCode: 'SUPPORTED',
        totalMemoryClassMb: 8192,
        availableDelegates: ['NNAPI'],
        runtimeVersion: '1.27.0',
        adapterId: 'onnxruntime-android',
      }),
      prepareModel: vi.fn().mockResolvedValue({
        contractVersion: CONTRACT_VERSION,
        modelId: 'lcm-sd15-chibi',
        modelVersion: '1.0.0',
        ready: true,
      }),
      generate: vi.fn(async () => {
        listeners.forEach((listener) =>
          listener({
            contractVersion: CONTRACT_VERSION,
            requestId: request.requestId,
            sequence: 1,
            stage: 'generating',
            stageProgress: 0.5,
            elapsedMs: 100,
          }),
        );
        return {
          requestId: request.requestId,
          localUri: 'file:///cache/request-1.png',
          mimeType: 'image/png' as const,
          width: 512,
          height: 512,
          adapterId: 'onnxruntime-android',
          temporary: true,
        };
      }),
      cancel: vi.fn(),
      addGenerationProgressListener: (listener: (event: NativeProgressEvent) => void) => {
        listeners.add(listener);
        return { remove: () => listeners.delete(listener) };
      },
    };
    const generator = new NativeOnDeviceStickerGenerator(bridge);
    const progress = vi.fn();

    const output = await generator.generate(request, progress);

    expect(output.temporary).toBe(true);
    expect(progress).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: 'request-1', sequence: 1, progressPercent: 50 }),
    );
  });

  test('ignores duplicate and late progress events', async () => {
    const listeners = new Set<(event: NativeProgressEvent) => void>();
    const bridge = {
      getCapabilities: vi.fn(),
      prepareModel: vi.fn(),
      generate: vi.fn(async () => {
        const event: NativeProgressEvent = {
          contractVersion: CONTRACT_VERSION,
          requestId: request.requestId,
          sequence: 1,
          stage: 'generating',
          stageProgress: 0.5,
          elapsedMs: 100,
        };
        listeners.forEach((listener) => listener(event));
        listeners.forEach((listener) => listener(event));
        return {
          requestId: request.requestId,
          localUri: 'file:///cache/request-1.png',
          mimeType: 'image/png' as const,
          width: 512,
          height: 512,
          adapterId: 'onnxruntime-android',
          temporary: true,
        };
      }),
      cancel: vi.fn(),
      addGenerationProgressListener: (listener: (event: NativeProgressEvent) => void) => {
        listeners.add(listener);
        return { remove: () => listeners.delete(listener) };
      },
    };
    const progress = vi.fn();

    await new NativeOnDeviceStickerGenerator(bridge).generate(request, progress);

    expect(progress).toHaveBeenCalledTimes(1);
  });

  test('maps a native NNAPI rejection to runtime unavailable with provider detail', async () => {
    const bridge = {
      getCapabilities: vi.fn(),
      prepareModel: vi.fn(),
      generate: vi
        .fn()
        .mockRejectedValue(
          new Error(
            "Call to 'generate' rejected: RUNTIME_UNAVAILABLE:NNAPI could not load the graph",
          ),
        ),
      cancel: vi.fn(),
      addGenerationProgressListener: vi.fn(() => ({ remove: vi.fn() })),
    };

    await expect(
      new NativeOnDeviceStickerGenerator(bridge).generate(request, vi.fn()),
    ).rejects.toMatchObject({
      code: 'RUNTIME_UNAVAILABLE',
      message: expect.stringContaining('NNAPI could not load the graph'),
    } satisfies Partial<GenerationFailure>);
  });
});
