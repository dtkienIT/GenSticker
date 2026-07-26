import type { GallerySticker, StickerAssetRepository } from '../assets/types';
import { SafetyFailure } from '../safety/failures';
import type { PromptSafetyEvaluator } from '../safety/types';
import { CONTRACT_VERSION, GenerationFailure } from './types';
import type {
  CancelResult,
  GenerationProgressEvent,
  GenerationRequest,
  OnDeviceStickerGenerator,
  StylePresetId,
} from './types';

export interface StickerDraft {
  prompt: string;
  stylePresetId: StylePresetId;
}

export const MVP_MODEL = {
  contractVersion: CONTRACT_VERSION,
  modelId: 'lcm-sd15-chibi',
  modelVersion: '1.0.1',
} as const;

interface CoordinatorDependencies {
  safety: PromptSafetyEvaluator;
  generator: OnDeviceStickerGenerator;
  repository: StickerAssetRepository;
  createRequestId: () => string;
  createSeed: () => number;
}

export class StickerGenerationCoordinator {
  private activeRequestId: string | null = null;

  constructor(private readonly dependencies: CoordinatorDependencies) {}

  async run(
    draft: StickerDraft,
    onProgress: (event: GenerationProgressEvent) => void,
  ): Promise<GallerySticker> {
    const safety = await this.dependencies.safety.evaluate(draft.prompt);
    if (safety.status === 'blocked') {
      throw new SafetyFailure(safety.reasonCode, false);
    }
    if (safety.status === 'failed') {
      throw new SafetyFailure(safety.code, safety.retryable);
    }

    const request: GenerationRequest = {
      contractVersion: CONTRACT_VERSION,
      requestId: this.dependencies.createRequestId(),
      prompt: safety.normalizedPrompt,
      stylePresetId: draft.stylePresetId,
      seed: this.dependencies.createSeed(),
      outputWidth: 512,
      outputHeight: 512,
    };
    this.activeRequestId = request.requestId;

    try {
      const readiness = await this.dependencies.generator.prepareModel(MVP_MODEL);
      if (!readiness.ready) throw new GenerationFailure(readiness.errorCode);
      const output = await this.dependencies.generator.generate(request, onProgress);
      onProgress({ requestId: request.requestId, stage: 'saving', progressPercent: 98 });
      return await this.dependencies.repository.persist(output, request);
    } finally {
      this.activeRequestId = null;
    }
  }

  async cancel(): Promise<CancelResult> {
    if (!this.activeRequestId) return { accepted: false, outcome: 'not_found' };
    return this.dependencies.generator.cancel(this.activeRequestId);
  }
}
