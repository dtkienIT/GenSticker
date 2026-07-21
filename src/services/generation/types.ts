export const CONTRACT_VERSION = '1.0' as const;

export type StylePresetId = 'chibi' | 'cartoon' | 'three-d' | 'meme';

export type GenerationStage =
  'preparing_model' | 'generating' | 'removing_background' | 'encoding' | 'saving';

export type GenerationErrorCode =
  | 'DEVICE_UNSUPPORTED'
  | 'RUNTIME_UNAVAILABLE'
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
    message = code,
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
}

export interface GeneratedOutput {
  requestId: string;
  localUri: string;
  mimeType: 'image/png';
  width: number;
  height: number;
  adapterId: string;
}

export type DeviceCapabilityResult =
  | { supported: true; adapterId: string }
  | {
      supported: false;
      reasonCode: 'DEVICE_UNSUPPORTED' | 'RUNTIME_UNAVAILABLE';
    };

export type CancelResult =
  | { accepted: true; outcome: 'cancellation_requested' }
  | { accepted: false; outcome: 'not_found' | 'already_terminal' };

export interface OnDeviceStickerGenerator {
  getCapabilities(): Promise<DeviceCapabilityResult>;
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
