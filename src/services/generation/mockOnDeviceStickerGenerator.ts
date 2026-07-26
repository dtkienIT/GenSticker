import type {
  CancelResult,
  DeviceCapabilityResult,
  GeneratedOutput,
  GenerationProgressEvent,
  GenerationRequest,
  GenerationStage,
  MockScenario,
  ModelReadiness,
  OnDeviceStickerGenerator,
  PrepareModelRequest,
  StylePresetId,
} from './types';
import { GenerationFailure } from './types';

interface MockGeneratorOptions {
  platform: string;
  outputResolver: (style: StylePresetId) => Promise<string>;
  scenario?: MockScenario;
  stepDelayMs?: number;
}

const STAGES: ReadonlyArray<{
  stage: Exclude<GenerationStage, 'saving'>;
  progressPercent: number;
}> = [
  { stage: 'preparing_model', progressPercent: 15 },
  { stage: 'generating', progressPercent: 55 },
  { stage: 'removing_background', progressPercent: 82 },
  { stage: 'encoding', progressPercent: 95 },
];

export class MockOnDeviceStickerGenerator implements OnDeviceStickerGenerator {
  private activeRequestId: string | null = null;
  private cancelledRequestId: string | null = null;
  private scenario: MockScenario;

  constructor(private readonly options: MockGeneratorOptions) {
    this.scenario = options.scenario ?? 'happy_path';
  }

  setScenario(scenario: MockScenario): void {
    this.scenario = scenario;
  }

  getScenario(): MockScenario {
    return this.scenario;
  }

  async getCapabilities(): Promise<DeviceCapabilityResult> {
    if (this.scenario === 'capability_failure') {
      throw new GenerationFailure('UNKNOWN_ERROR');
    }
    if (this.options.platform !== 'android' || this.scenario === 'unsupported') {
      return { supported: false, reasonCode: 'DEVICE_UNSUPPORTED' };
    }
    return { supported: true, adapterId: 'mock' };
  }

  async prepareModel(request: PrepareModelRequest): Promise<ModelReadiness> {
    return { ...request, ready: true };
  }

  async generate(
    request: GenerationRequest,
    onProgress: (event: GenerationProgressEvent) => void,
  ): Promise<GeneratedOutput> {
    if (this.activeRequestId) {
      throw new GenerationFailure('GENERATION_BUSY');
    }
    this.activeRequestId = request.requestId;
    this.cancelledRequestId = null;

    try {
      const capabilities = await this.getCapabilities();
      if (!capabilities.supported) {
        throw new GenerationFailure(capabilities.reasonCode);
      }

      for (const progress of STAGES) {
        this.throwIfCancelled(request.requestId);
        onProgress({ requestId: request.requestId, ...progress });
        this.throwInjectedFailure(progress.stage);
        await delay(this.options.stepDelayMs ?? 450);
      }

      this.throwIfCancelled(request.requestId);
      const localUri = await this.options.outputResolver(request.stylePresetId);
      return {
        requestId: request.requestId,
        localUri,
        mimeType: 'image/png',
        width: request.outputWidth,
        height: request.outputHeight,
        adapterId: 'mock',
      };
    } finally {
      this.activeRequestId = null;
    }
  }

  async cancel(requestId: string): Promise<CancelResult> {
    if (this.activeRequestId === requestId) {
      this.cancelledRequestId = requestId;
      return { accepted: true, outcome: 'cancellation_requested' };
    }
    return { accepted: false, outcome: 'not_found' };
  }

  private throwIfCancelled(requestId: string): void {
    if (this.cancelledRequestId === requestId) {
      throw new GenerationFailure('GENERATION_CANCELLED');
    }
  }

  private throwInjectedFailure(stage: Exclude<GenerationStage, 'saving'>): void {
    const failures: Partial<
      Record<
        MockScenario,
        { stage: Exclude<GenerationStage, 'saving'>; code: GenerationFailure['code'] }
      >
    > = {
      generation_timeout: { stage: 'generating', code: 'GENERATION_TIMEOUT' },
      inference_failure: { stage: 'generating', code: 'INFERENCE_FAILED' },
      segmentation_failure: { stage: 'removing_background', code: 'SEGMENTATION_FAILED' },
      encoding_failure: { stage: 'encoding', code: 'ASSET_ENCODING_FAILED' },
    };
    const failure = failures[this.scenario];
    if (failure?.stage === stage) {
      throw new GenerationFailure(failure.code);
    }
  }
}

function delay(durationMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}
