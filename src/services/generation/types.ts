export const CONTRACT_VERSION = '1.0' as const;

export type StylePresetId = 'chibi' | 'cartoon' | 'three-d' | 'meme';

export type GenerationStage =
  | 'validating'
  | 'preparing_model'
  | 'generating'
  | 'removing_background'
  | 'encoding'
  | 'completed'
  | 'saving';

export type GenerationErrorCode =
  | 'DEVICE_UNSUPPORTED'
  | 'RUNTIME_UNAVAILABLE'
  | 'MODEL_NOT_AVAILABLE'
  | 'MODEL_INCOMPATIBLE'
  | 'INSUFFICIENT_MEMORY'
  | 'GENERATION_BUSY'
  | 'GENERATION_CANCELLED'
  | 'GENERATION_TIMEOUT'
  | 'INFERENCE_FAILED'
  | 'SEGMENTATION_FAILED'
  | 'ASSET_ENCODING_FAILED'
  | 'ASSET_STORAGE_FAILED'
  | 'UNKNOWN_ERROR';

const RETRYABLE_ERRORS = new Set<GenerationErrorCode>([
  'GENERATION_BUSY',
  'GENERATION_CANCELLED',
  'GENERATION_TIMEOUT',
  'INFERENCE_FAILED',
  'SEGMENTATION_FAILED',
  'ASSET_ENCODING_FAILED',
  'ASSET_STORAGE_FAILED',
  'UNKNOWN_ERROR',
]);

export class GenerationFailure extends Error {
  readonly retryable: boolean;

  constructor(
    readonly code: GenerationErrorCode,
    message: string = code,
  ) {
    super(message);
    this.name = 'GenerationFailure';
    this.retryable = RETRYABLE_ERRORS.has(code);
  }
}

export interface GenerationRequest {
  contractVersion: typeof CONTRACT_VERSION;
  requestId: string;
  prompt: string;
  stylePresetId: StylePresetId;
  seed: number;
  outputWidth: number;
  outputHeight: number;
}

export interface GenerationProgressEvent {
  requestId: string;
  stage: GenerationStage;
  progressPercent: number;
  sequence?: number;
  stageProgress?: number;
  elapsedMs?: number;
}

export interface GeneratedOutput {
  requestId: string;
  localUri: string;
  mimeType: 'image/png';
  width: number;
  height: number;
  adapterId: string;
  temporary?: boolean;
}

export type DeviceCapabilityResult =
  | {
      supported: true;
      adapterId: string;
      totalMemoryClassMb?: number;
      deviceKind?: 'physical' | 'emulator';
      architecture?: string;
      availableDelegates?: string[];
      selectedDelegate?: string;
      runtimeVersion?: string;
    }
  | {
      supported: false;
      reasonCode: 'DEVICE_UNSUPPORTED' | 'RUNTIME_UNAVAILABLE' | 'INSUFFICIENT_MEMORY';
      deviceKind?: 'physical' | 'emulator';
      architecture?: string;
    };

export interface PrepareModelRequest {
  contractVersion: typeof CONTRACT_VERSION;
  modelId: string;
  modelVersion: string;
}

export type ModelReadiness =
  | { contractVersion: typeof CONTRACT_VERSION; modelId: string; modelVersion: string; ready: true }
  | {
      contractVersion: typeof CONTRACT_VERSION;
      modelId: string;
      modelVersion: string;
      ready: false;
      errorCode: GenerationErrorCode;
    };

export type CancelResult =
  | { accepted: true; outcome: 'cancellation_requested' }
  | { accepted: false; outcome: 'not_found' | 'already_terminal' };

export interface OnDeviceStickerGenerator {
  getCapabilities(): Promise<DeviceCapabilityResult>;
  prepareModel(request: PrepareModelRequest): Promise<ModelReadiness>;
  generate(
    request: GenerationRequest,
    onProgress: (event: GenerationProgressEvent) => void,
  ): Promise<GeneratedOutput>;
  cancel(requestId: string): Promise<CancelResult>;
}

export type MockScenario =
  | 'happy_path'
  | 'unsupported'
  | 'capability_failure'
  | 'generation_timeout'
  | 'inference_failure'
  | 'segmentation_failure'
  | 'encoding_failure'
  | 'storage_failure'
  | 'safety_failure'
  | 'save_failure'
  | 'share_failure';

export const MOCK_SCENARIOS: readonly MockScenario[] = [
  'happy_path',
  'unsupported',
  'capability_failure',
  'generation_timeout',
  'inference_failure',
  'segmentation_failure',
  'encoding_failure',
  'storage_failure',
  'safety_failure',
  'save_failure',
  'share_failure',
];
