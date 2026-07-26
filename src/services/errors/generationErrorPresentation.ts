import { GenerationFailure } from '../generation/types';
import { SafetyFailure } from '../safety/failures';

export interface StickerErrorPresentation {
  code: string;
  title: string;
  message: string;
  retryable: boolean;
}

const GENERATION_COPY: Record<
  GenerationFailure['code'],
  Omit<StickerErrorPresentation, 'code' | 'retryable'>
> = {
  DEVICE_UNSUPPORTED: {
    title: 'Device not supported yet',
    message: 'This Android device does not meet the current on-device generation requirements.',
  },
  RUNTIME_UNAVAILABLE: {
    title: 'On-device runtime unavailable',
    message: 'The Android inference runtime has not been connected in this build.',
  },
  MODEL_NOT_AVAILABLE: {
    title: 'Model setup required',
    message: 'Download and verify the local sticker model before generating.',
  },
  MODEL_INCOMPATIBLE: {
    title: 'Model update required',
    message: 'The installed model does not match this app build. Download it again.',
  },
  INSUFFICIENT_MEMORY: {
    title: 'Not enough device memory',
    message: 'This device cannot safely run the local sticker model.',
  },
  GENERATION_BUSY: {
    title: 'Generation already running',
    message: 'Wait for the active sticker to finish, then try again.',
  },
  GENERATION_CANCELLED: {
    title: 'Generation cancelled',
    message: 'No sticker was saved. You can start again whenever you are ready.',
  },
  GENERATION_TIMEOUT: {
    title: 'Generation took too long',
    message: 'The on-device run timed out. Try again or simplify the prompt.',
  },
  INFERENCE_FAILED: {
    title: 'Could not generate the image',
    message: 'The on-device image stage failed. Your prompt is still available for retry.',
  },
  SEGMENTATION_FAILED: {
    title: 'Could not remove the background',
    message: 'The sticker cutout could not be completed. Try the generation again.',
  },
  ASSET_ENCODING_FAILED: {
    title: 'Could not prepare the PNG',
    message: 'The transparent sticker file could not be encoded. Try again.',
  },
  ASSET_STORAGE_FAILED: {
    title: 'Could not save the sticker',
    message: 'The generated file was not added to your gallery. Free some space and retry.',
  },
  UNKNOWN_ERROR: {
    title: 'Something went wrong',
    message: 'The local generation flow could not finish. Try again.',
  },
};

export function presentStickerError(error: unknown): StickerErrorPresentation {
  if (error instanceof SafetyFailure) {
    return error.code === 'PROMPT_BLOCKED'
      ? {
          code: error.code,
          title: 'Request cannot be generated',
          message: 'Try a different description that follows the supported-use guidelines.',
          retryable: false,
        }
      : {
          code: error.code,
          title: 'Safety check unavailable',
          message: 'The on-device prompt check could not run. Try again before generating.',
          retryable: error.retryable,
        };
  }
  if (error instanceof GenerationFailure) {
    return { code: error.code, ...GENERATION_COPY[error.code], retryable: error.retryable };
  }
  return {
    code: 'UNKNOWN_ERROR',
    ...GENERATION_COPY.UNKNOWN_ERROR,
    retryable: true,
  };
}
