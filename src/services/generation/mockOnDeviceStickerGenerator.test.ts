import { describe, expect, it } from 'vitest';
import { GenerationFailure, type GenerationProgressEvent, type GenerationRequest } from './types';
import { MockOnDeviceStickerGenerator } from './mockOnDeviceStickerGenerator';

const request = (requestId = 'request-1'): GenerationRequest => ({
  contractVersion: '1.0',
  requestId,
  prompt: 'A cheerful astronaut cat',
  stylePresetId: 'chibi',
  seed: 42,
  outputWidth: 1024,
  outputHeight: 1024,
});

describe('MockOnDeviceStickerGenerator', () => {
  it('reports the Android mock runtime as supported', async () => {
    const generator = new MockOnDeviceStickerGenerator({
      platform: 'android',
      outputResolver: async () => 'file:///mock/chibi.png',
      stepDelayMs: 0,
    });

    await expect(generator.getCapabilities()).resolves.toEqual({
      supported: true,
      adapterId: 'mock',
    });
  });

  it('reports the iOS simulator mock runtime as supported', async () => {
    const generator = new MockOnDeviceStickerGenerator({
      platform: 'ios',
      outputResolver: async () => 'file:///mock/chibi.png',
      stepDelayMs: 0,
    });

    await expect(generator.getCapabilities()).resolves.toEqual({
      supported: true,
      adapterId: 'mock',
    });
  });

  it('emits deterministic stages and a transparent PNG output', async () => {
    const progress: GenerationProgressEvent[] = [];
    const generator = new MockOnDeviceStickerGenerator({
      platform: 'android',
      outputResolver: async () => 'file:///mock/chibi.png',
      stepDelayMs: 0,
    });

    const output = await generator.generate(request(), (event) => progress.push(event));

    expect(progress.map((event) => event.stage)).toEqual([
      'preparing_model',
      'generating',
      'removing_background',
      'encoding',
    ]);
    expect(output).toMatchObject({
      requestId: 'request-1',
      localUri: 'file:///mock/chibi.png',
      mimeType: 'image/png',
      width: 1024,
      height: 1024,
      adapterId: 'mock',
    });
  });

  it('rejects concurrent generation as busy', async () => {
    const generator = new MockOnDeviceStickerGenerator({
      platform: 'android',
      outputResolver: async () => 'file:///mock/chibi.png',
      stepDelayMs: 20,
    });

    const active = generator.generate(request('active'), () => undefined);
    await expect(generator.generate(request('second'), () => undefined)).rejects.toMatchObject({
      code: 'GENERATION_BUSY',
      retryable: true,
    });
    await active;
  });

  it('cancels an active request without producing output', async () => {
    const generator = new MockOnDeviceStickerGenerator({
      platform: 'android',
      outputResolver: async () => 'file:///mock/chibi.png',
      stepDelayMs: 20,
    });
    const active = generator.generate(request('cancel-me'), () => undefined);

    await expect(generator.cancel('cancel-me')).resolves.toEqual({
      accepted: true,
      outcome: 'cancellation_requested',
    });
    await expect(active).rejects.toMatchObject({
      code: 'GENERATION_CANCELLED',
      retryable: true,
    });
  });

  it('maps an injected stage failure to a stable retryable error', async () => {
    const generator = new MockOnDeviceStickerGenerator({
      platform: 'android',
      scenario: 'segmentation_failure',
      outputResolver: async () => 'file:///mock/chibi.png',
      stepDelayMs: 0,
    });

    await expect(generator.generate(request(), () => undefined)).rejects.toEqual(
      new GenerationFailure('SEGMENTATION_FAILED'),
    );
  });
});
