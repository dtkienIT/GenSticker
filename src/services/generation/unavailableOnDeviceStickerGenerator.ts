import { GenerationFailure } from './types';
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

export class UnavailableOnDeviceStickerGenerator implements OnDeviceStickerGenerator {
  async getCapabilities(): Promise<DeviceCapabilityResult> {
    return { supported: false, reasonCode: 'RUNTIME_UNAVAILABLE' };
  }

  async prepareModel(request: PrepareModelRequest): Promise<ModelReadiness> {
    return { ...request, ready: false, errorCode: 'MODEL_NOT_AVAILABLE' };
  }

  async generate(
    _request: GenerationRequest,
    _onProgress: (event: GenerationProgressEvent) => void,
  ): Promise<GeneratedOutput> {
    throw new GenerationFailure('RUNTIME_UNAVAILABLE');
  }

  async cancel(): Promise<CancelResult> {
    return { accepted: false, outcome: 'not_found' };
  }
}
