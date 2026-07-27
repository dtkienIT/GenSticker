import type { ModelBundleErrorCode, ModelBundleState } from './types';

export interface LocalModelSetupPresentation {
  action: 'installLocal' | 'download' | 'cancel' | 'none';
  buttonLabel: string;
  message: string;
}

const FAILURE_MESSAGES: Partial<Record<ModelBundleErrorCode, string>> = {
  LOCAL_MODEL_SERVER_UNAVAILABLE:
    'The project model server is unavailable. Run npm run web:model:serve, then retry.',
  LOCAL_MODEL_NOT_STAGED:
    'No staged model was found. Run scripts/stage-local-model.ps1, then retry.',
  MODEL_CHECKSUM_MISMATCH: 'The staged model failed checksum verification. Stage the files again.',
  INSUFFICIENT_STORAGE: 'The emulator does not have enough free storage.',
  MODEL_PROMOTION_FAILED:
    'The verified model could not be installed. Restart the emulator and retry.',
};

export function presentLocalModelSetup(
  state: ModelBundleState | null,
  development: boolean,
): LocalModelSetupPresentation {
  if (state?.status === 'ready') {
    return { action: 'none', buttonLabel: '', message: 'Local model is ready.' };
  }
  if (state?.status === 'downloading') {
    return {
      action: 'cancel',
      buttonLabel: 'Cancel download',
      message: 'Downloading the local model.',
    };
  }
  if (state?.status === 'verifying') {
    return { action: 'none', buttonLabel: '', message: 'Verifying the staged model files.' };
  }

  const failureMessage = state?.status === 'failed' ? FAILURE_MESSAGES[state.errorCode] : undefined;

  if (development) {
    return {
      action: 'installLocal',
      buttonLabel: 'Install staged local model',
      message:
        failureMessage ??
        'Stage the local model from this computer, then verify and install it here.',
    };
  }
  return {
    action: 'download',
    buttonLabel: 'Download local model',
    message: failureMessage ?? 'Download the verified local model once to generate offline.',
  };
}
