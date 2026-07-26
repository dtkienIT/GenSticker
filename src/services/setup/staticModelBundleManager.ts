import type { ModelBundleManager, ModelBundleState } from './types';

const READY: ModelBundleState = {
  status: 'ready',
  modelId: 'mock',
  modelVersion: '1.0.1',
  downloadedBytes: 0,
  totalBytes: 0,
};

export class StaticModelBundleManager implements ModelBundleManager {
  constructor(private readonly state: ModelBundleState = READY) {}
  getState(): Promise<ModelBundleState> {
    return Promise.resolve(this.state);
  }
  start(): Promise<ModelBundleState> {
    return Promise.resolve(this.state);
  }
  installLocal(): Promise<ModelBundleState> {
    return Promise.resolve(this.state);
  }
  cancel(): Promise<ModelBundleState> {
    return Promise.resolve(this.state);
  }
}
