export type ModelBundleErrorCode =
  | 'NETWORK_UNAVAILABLE'
  | 'DOWNLOAD_CANCELLED'
  | 'DOWNLOAD_FAILED'
  | 'CHECKSUM_MISMATCH'
  | 'INSUFFICIENT_STORAGE'
  | 'LOCAL_MODEL_NOT_STAGED'
  | 'MODEL_CHECKSUM_MISMATCH'
  | 'MODEL_PROMOTION_FAILED';

interface ModelBundleBase {
  modelId: string;
  modelVersion: string;
  downloadedBytes: number;
  totalBytes: number;
}

export type ModelBundleState =
  | (ModelBundleBase & { status: 'missing' | 'downloading' | 'verifying' | 'ready' })
  | (ModelBundleBase & { status: 'failed'; errorCode: ModelBundleErrorCode });

export interface ModelDownloadProgress {
  phase: 'downloading' | 'verifying';
  downloadedBytes: number;
  totalBytes: number;
}

export interface ModelBundleManager {
  getState(): Promise<ModelBundleState>;
  start(onProgress: (event: ModelDownloadProgress) => void): Promise<ModelBundleState>;
  installLocal(onProgress: (event: ModelDownloadProgress) => void): Promise<ModelBundleState>;
  cancel(): Promise<ModelBundleState>;
}
