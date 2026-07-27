import { describe, expect, it, vi } from 'vitest';
import { CONTRACT_VERSION, GenerationFailure, type GenerationRequest } from '../types';
import { WebOnDeviceStickerGenerator, type WorkerLike } from './webOnDeviceStickerGenerator';
import type { WorkerRequest, WorkerResponse } from './workerProtocol';

class FakeWorker implements WorkerLike {
  onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  readonly postMessage = vi.fn((message: WorkerRequest) => {
    if (message.type === 'prepare') {
      this.emit({ type: 'ready', requestId: message.requestId });
    }
  });
  readonly terminate = vi.fn();

  emit(message: WorkerResponse): void {
    this.onmessage?.({ data: message } as MessageEvent<WorkerResponse>);
  }
}

const request: GenerationRequest = {
  contractVersion: CONTRACT_VERSION,
  requestId: 'request-1',
  prompt: 'A cheerful cat',
  stylePresetId: 'chibi',
  seed: 42,
  outputWidth: 512,
  outputHeight: 512,
};

function createGenerator(worker: FakeWorker) {
  return new WebOnDeviceStickerGenerator({
    resolveModelFiles: vi.fn(async () => ({
      modelId: 'lcm-sd15-chibi',
      modelVersion: '1.0.1',
      manifestUrl: 'http://model/manifest.json',
      runtimeConfigUrl: 'http://model/runtime.json',
      schedulerUrl: 'http://model/scheduler.json',
      textEncoderUrl: 'http://model/text.onnx',
      tokenizerUrl: 'http://model/tokenizer.json',
      tokenizerConfigUrl: 'http://model/tokenizer-config.json',
      unetUrl: 'http://model/unet.onnx',
      vaeDecoderUrl: 'http://model/vae.onnx',
      segmentationUrl: 'http://model/u2netp.onnx',
      parts: [],
    })),
    getCapabilities: vi.fn(async () => ({
      supported: true as const,
      adapterId: 'onnxruntime-web-webgpu',
      selectedDelegate: 'WebGPU',
    })),
    createWorker: () => worker,
    createObjectUrl: vi.fn(() => 'blob:sticker'),
    revokeObjectUrl: vi.fn(),
  });
}

describe('WebOnDeviceStickerGenerator', () => {
  it('prepares the worker and returns ordered progress plus a PNG URL', async () => {
    const worker = new FakeWorker();
    const generator = createGenerator(worker);
    await expect(
      generator.prepareModel({
        contractVersion: CONTRACT_VERSION,
        modelId: 'lcm-sd15-chibi',
        modelVersion: '1.0.1',
      }),
    ).resolves.toMatchObject({ ready: true });
    const progress = vi.fn();
    const outputPromise = generator.generate(request, progress);

    worker.emit({
      type: 'progress',
      requestId: request.requestId,
      sequence: 2,
      stage: 'generating',
      stageProgress: 0.5,
      elapsedMs: 20,
    });
    worker.emit({
      type: 'progress',
      requestId: request.requestId,
      sequence: 1,
      stage: 'generating',
      stageProgress: 0.25,
      elapsedMs: 10,
    });
    worker.emit({
      type: 'result',
      requestId: request.requestId,
      pngBytes: new Uint8Array([1, 2, 3]).buffer,
      width: 512,
      height: 512,
    });

    await expect(outputPromise).resolves.toMatchObject({
      localUri: 'blob:sticker',
      mimeType: 'image/png',
      temporary: true,
    });
    expect(progress).toHaveBeenCalledOnce();
    expect(progress).toHaveBeenCalledWith(
      expect.objectContaining({ sequence: 2, progressPercent: 50 }),
    );
  });

  it('rejects concurrent generation and maps worker failures', async () => {
    const worker = new FakeWorker();
    const generator = createGenerator(worker);
    await generator.prepareModel({
      contractVersion: CONTRACT_VERSION,
      modelId: 'lcm-sd15-chibi',
      modelVersion: '1.0.1',
    });
    const active = generator.generate(request, vi.fn());

    await expect(
      generator.generate({ ...request, requestId: 'request-2' }, vi.fn()),
    ).rejects.toEqual(expect.objectContaining({ code: 'GENERATION_BUSY' }));
    worker.emit({
      type: 'failure',
      requestId: request.requestId,
      code: 'INFERENCE_FAILED',
      message: 'UNet failed',
    });
    await expect(active).rejects.toEqual(
      expect.objectContaining<Partial<GenerationFailure>>({ code: 'INFERENCE_FAILED' }),
    );
  });

  it('terminates the worker when an active request is cancelled', async () => {
    const worker = new FakeWorker();
    const generator = createGenerator(worker);
    await generator.prepareModel({
      contractVersion: CONTRACT_VERSION,
      modelId: 'lcm-sd15-chibi',
      modelVersion: '1.0.1',
    });
    void generator.generate(request, vi.fn()).catch(() => undefined);

    await expect(generator.cancel('request-1')).resolves.toEqual({
      accepted: true,
      outcome: 'cancellation_requested',
    });
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
});
