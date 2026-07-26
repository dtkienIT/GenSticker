import type {
  CancelResult,
  DeviceCapabilityResult,
  GeneratedOutput,
  GenerationProgressEvent,
  GenerationRequest,
  ModelReadiness,
  OnDeviceStickerGenerator,
  PrepareModelRequest,
} from './types';
import { GenerationFailure, type GenerationErrorCode } from './types';

interface Subscription {
  remove(): void;
}

export interface NativeProgressEvent {
  contractVersion: string;
  requestId: string;
  sequence: number;
  stage: GenerationProgressEvent['stage'];
  stageProgress: number;
  elapsedMs: number;
}

export interface NativeStickerRuntimeBridge {
  getCapabilities(): Promise<DeviceCapabilityResult>;
  prepareModel(request: PrepareModelRequest): Promise<ModelReadiness>;
  generate(request: GenerationRequest): Promise<GeneratedOutput>;
  cancel(requestId: string): Promise<CancelResult>;
  addGenerationProgressListener(listener: (event: NativeProgressEvent) => void): Subscription;
}

const NATIVE_ERROR_CODES: readonly GenerationErrorCode[] = [
  'DEVICE_UNSUPPORTED',
  'RUNTIME_UNAVAILABLE',
  'MODEL_NOT_AVAILABLE',
  'MODEL_INCOMPATIBLE',
  'INSUFFICIENT_MEMORY',
  'GENERATION_BUSY',
  'GENERATION_CANCELLED',
  'GENERATION_TIMEOUT',
  'INFERENCE_FAILED',
  'SEGMENTATION_FAILED',
  'ASSET_ENCODING_FAILED',
  'ASSET_STORAGE_FAILED',
];

function mapNativeFailure(error: unknown): GenerationFailure {
  if (error instanceof GenerationFailure) return error;
  const message = error instanceof Error ? error.message : String(error);
  const code: GenerationErrorCode =
    NATIVE_ERROR_CODES.find((candidate) => message.includes(candidate)) ?? 'UNKNOWN_ERROR';
  return new GenerationFailure(code, message);
}

export class NativeOnDeviceStickerGenerator implements OnDeviceStickerGenerator {
  constructor(private readonly bridge: NativeStickerRuntimeBridge) {}

  getCapabilities(): Promise<DeviceCapabilityResult> {
    return this.bridge.getCapabilities();
  }

  prepareModel(request: PrepareModelRequest): Promise<ModelReadiness> {
    return this.bridge.prepareModel(request);
  }

  async generate(
    request: GenerationRequest,
    onProgress: (event: GenerationProgressEvent) => void,
  ): Promise<GeneratedOutput> {
    let lastSequence = 0;
    let terminal = false;
    const subscription = this.bridge.addGenerationProgressListener((event) => {
      if (terminal || event.requestId !== request.requestId || event.sequence <= lastSequence)
        return;
      lastSequence = event.sequence;
      onProgress({
        requestId: event.requestId,
        stage: event.stage,
        progressPercent: Math.round(Math.max(0, Math.min(1, event.stageProgress)) * 100),
        sequence: event.sequence,
        stageProgress: event.stageProgress,
        elapsedMs: event.elapsedMs,
      });
    });
    try {
      return await this.bridge.generate(request);
    } catch (error) {
      throw mapNativeFailure(error);
    } finally {
      terminal = true;
      subscription.remove();
    }
  }

  cancel(requestId: string): Promise<CancelResult> {
    return this.bridge.cancel(requestId);
  }
}
