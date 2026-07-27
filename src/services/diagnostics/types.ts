import type { GenerationErrorCode, GenerationStage } from '../generation/types';

export type WebCapabilityDetailCode =
  | 'INSECURE_CONTEXT'
  | 'UNSUPPORTED_BROWSER'
  | 'WEBGPU_UNAVAILABLE'
  | 'FP16_UNAVAILABLE'
  | 'INSUFFICIENT_STORAGE';

export interface LocalDiagnosticEvent {
  id: string;
  recordedAt: string;
  kind: 'capability' | 'model' | 'generation' | 'error';
  requestId?: string;
  stage?: GenerationStage;
  elapsedMs?: number;
  errorCode?: GenerationErrorCode;
  detailCode?: WebCapabilityDetailCode | string;
  metadata?: Record<string, string | number | boolean | null>;
}
