import { describe, expect, it } from 'vitest';
import type { GallerySticker, StickerAssetRepository } from '../assets/types';
import type { PromptSafetyEvaluator } from '../safety/types';
import { SafetyFailure } from '../safety/failures';
import type {
  CancelResult,
  DeviceCapabilityResult,
  GeneratedOutput,
  GenerationProgressEvent,
  GenerationRequest,
  OnDeviceStickerGenerator,
} from './types';
import { StickerGenerationCoordinator } from './stickerGenerationCoordinator';

class RecordingGenerator implements OnDeviceStickerGenerator {
  requests: GenerationRequest[] = [];

  async getCapabilities(): Promise<DeviceCapabilityResult> {
    return { supported: true, adapterId: 'test' };
  }

  async generate(
    request: GenerationRequest,
    onProgress: (event: GenerationProgressEvent) => void,
  ): Promise<GeneratedOutput> {
    this.requests.push(request);
    onProgress({ requestId: request.requestId, stage: 'generating', progressPercent: 50 });
    return {
      requestId: request.requestId,
      localUri: 'file:///cache/result.png',
      mimeType: 'image/png',
      width: request.outputWidth,
      height: request.outputHeight,
      adapterId: 'test',
    };
  }

  async cancel(): Promise<CancelResult> {
    return { accepted: false, outcome: 'not_found' };
  }
}

class RecordingRepository implements StickerAssetRepository {
  items: GallerySticker[] = [];

  async persist(output: GeneratedOutput, request: GenerationRequest): Promise<GallerySticker> {
    const item: GallerySticker = {
      assetId: `asset-${request.requestId}`,
      requestId: request.requestId,
      localUri: `file:///documents/${request.requestId}.png`,
      prompt: request.prompt,
      stylePresetId: request.stylePresetId,
      createdAt: '2026-07-21T00:00:00.000Z',
      mimeType: 'image/png',
      width: output.width,
      height: output.height,
    };
    this.items.push(item);
    return item;
  }

  async list(): Promise<GallerySticker[]> {
    return this.items;
  }

  async get(assetId: string): Promise<GallerySticker | null> {
    return this.items.find((item) => item.assetId === assetId) ?? null;
  }

  async delete(assetId: string): Promise<void> {
    this.items = this.items.filter((item) => item.assetId !== assetId);
  }
}

function coordinator(
  safety: PromptSafetyEvaluator,
  generator = new RecordingGenerator(),
  repository = new RecordingRepository(),
) {
  let id = 0;
  return {
    generator,
    repository,
    coordinator: new StickerGenerationCoordinator({
      safety,
      generator,
      repository,
      createRequestId: () => `request-${++id}`,
      createSeed: () => 123,
    }),
  };
}

describe('StickerGenerationCoordinator', () => {
  it('never calls generation when safety blocks the prompt', async () => {
    const setup = coordinator({
      evaluate: async () => ({ status: 'blocked', reasonCode: 'PROMPT_BLOCKED' }),
    });

    await expect(
      setup.coordinator.run({ prompt: 'blocked', stylePresetId: 'meme' }, () => undefined),
    ).rejects.toEqual(new SafetyFailure('PROMPT_BLOCKED', false));
    expect(setup.generator.requests).toEqual([]);
    expect(setup.repository.items).toEqual([]);
  });

  it('persists output before returning a successful gallery item', async () => {
    const setup = coordinator({
      evaluate: async () => ({ status: 'allowed', normalizedPrompt: 'Astronaut cat' }),
    });

    const result = await setup.coordinator.run(
      { prompt: '  Astronaut cat ', stylePresetId: 'chibi' },
      () => undefined,
    );

    expect(result.prompt).toBe('Astronaut cat');
    expect(setup.repository.items).toEqual([result]);
  });

  it('creates a fresh request and asset for each regeneration', async () => {
    const setup = coordinator({
      evaluate: async (prompt) => ({ status: 'allowed', normalizedPrompt: prompt }),
    });

    const first = await setup.coordinator.run(
      { prompt: 'Astronaut cat', stylePresetId: 'chibi' },
      () => undefined,
    );
    const second = await setup.coordinator.run(
      { prompt: 'Astronaut cat', stylePresetId: 'chibi' },
      () => undefined,
    );

    expect(first.requestId).not.toBe(second.requestId);
    expect(first.assetId).not.toBe(second.assetId);
  });

  it('maps evaluator failure to a retryable safety failure', async () => {
    const setup = coordinator({
      evaluate: async () => ({ status: 'failed', code: 'EVALUATOR_FAILED', retryable: true }),
    });

    await expect(
      setup.coordinator.run({ prompt: 'Prompt', stylePresetId: 'cartoon' }, () => undefined),
    ).rejects.toEqual(new SafetyFailure('EVALUATOR_FAILED', true));
  });
});
