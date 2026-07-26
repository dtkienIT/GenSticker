import type { ModelBundleManager, ModelBundleState, ModelDownloadProgress } from './types';

interface Subscription {
  remove(): void;
}

export interface NativeModelBundleBridge {
  getModelBundleState(): Promise<ModelBundleState>;
  startModelDownload(): Promise<ModelBundleState>;
  installLocalModel(): Promise<ModelBundleState>;
  cancelModelDownload(): Promise<ModelBundleState>;
  addModelDownloadProgressListener(listener: (event: ModelDownloadProgress) => void): Subscription;
}

export class NativeModelBundleManager implements ModelBundleManager {
  constructor(private readonly bridge: NativeModelBundleBridge) {}

  getState(): Promise<ModelBundleState> {
    return this.bridge.getModelBundleState();
  }

  async start(onProgress: (event: ModelDownloadProgress) => void): Promise<ModelBundleState> {
    const subscription = this.bridge.addModelDownloadProgressListener(onProgress);
    try {
      return await this.bridge.startModelDownload();
    } finally {
      subscription.remove();
    }
  }

  async installLocal(
    onProgress: (event: ModelDownloadProgress) => void,
  ): Promise<ModelBundleState> {
    const subscription = this.bridge.addModelDownloadProgressListener(onProgress);
    try {
      return await this.bridge.installLocalModel();
    } finally {
      subscription.remove();
    }
  }

  cancel(): Promise<ModelBundleState> {
    return this.bridge.cancelModelDownload();
  }
}
