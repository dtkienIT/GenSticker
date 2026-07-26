import { requireOptionalNativeModule } from 'expo';
import type { NativeProgressEvent } from '../../../src/services/generation/nativeOnDeviceStickerGenerator';
import type {
  CancelResult,
  DeviceCapabilityResult,
  GeneratedOutput,
  GenerationRequest,
  ModelReadiness,
  PrepareModelRequest,
} from '../../../src/services/generation/types';
import type {
  ModelBundleState,
  ModelDownloadProgress,
} from '../../../src/services/setup/types';

interface Subscription {
  remove(): void;
}

export interface ExpoStickerRuntimeModule {
  getCapabilities(): Promise<DeviceCapabilityResult>;
  getModelBundleState(): Promise<ModelBundleState>;
  startModelDownload(): Promise<ModelBundleState>;
  installLocalModel(): Promise<ModelBundleState>;
  cancelModelDownload(): Promise<ModelBundleState>;
  prepareModel(request: PrepareModelRequest): Promise<ModelReadiness>;
  generate(request: GenerationRequest): Promise<GeneratedOutput>;
  cancel(requestId: string): Promise<CancelResult>;
  addListener(
    eventName: 'onGenerationProgress',
    listener: (event: NativeProgressEvent) => void,
  ): Subscription;
  addListener(
    eventName: 'onModelDownloadProgress',
    listener: (event: ModelDownloadProgress) => void,
  ): Subscription;
}

export const ExpoStickerRuntime =
  requireOptionalNativeModule<ExpoStickerRuntimeModule>('ExpoStickerRuntime');
