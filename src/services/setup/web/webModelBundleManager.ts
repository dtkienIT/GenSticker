import type { ModelBundleManager, ModelBundleState, ModelDownloadProgress } from '../types';
import {
  parseWebModelManifest,
  resolveWebModelFiles,
  WEB_MODEL_ID,
  WEB_MODEL_VERSION,
  type WebModelFiles,
  type WebModelManifest,
} from './webModelManifest';

export interface WebModelConfig {
  source: 'local' | 'cache';
  baseUrl: string;
}

export interface WebModelBundleDependencies {
  fetch: typeof fetch;
  loadManifest?: () => Promise<WebModelManifest>;
}

const EMPTY_STATE = {
  modelId: WEB_MODEL_ID,
  modelVersion: WEB_MODEL_VERSION,
  downloadedBytes: 0,
  totalBytes: 0,
} as const;

export class WebModelBundleManager implements ModelBundleManager {
  private manifest: WebModelManifest | null = null;
  private cancelled = false;

  constructor(
    private readonly config: WebModelConfig,
    private readonly dependencies: WebModelBundleDependencies,
  ) {}

  private async loadManifest(): Promise<WebModelManifest> {
    if (this.manifest) {
      return this.manifest;
    }
    if (this.dependencies.loadManifest) {
      this.manifest = await this.dependencies.loadManifest();
      return this.manifest;
    }
    const manifestUrl = new URL('model-distribution.manifest.json', this.config.baseUrl).href;
    const response = await this.dependencies.fetch(manifestUrl, {
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new Error(`Model manifest request failed: ${response.status}`);
    }
    this.manifest = parseWebModelManifest(await response.text());
    return this.manifest;
  }

  private failed(
    errorCode: Extract<ModelBundleState, { status: 'failed' }>['errorCode'],
    manifest = this.manifest,
  ): ModelBundleState {
    return {
      status: 'failed',
      modelId: manifest?.modelId ?? EMPTY_STATE.modelId,
      modelVersion: manifest?.modelVersion ?? EMPTY_STATE.modelVersion,
      downloadedBytes: 0,
      totalBytes: manifest?.artifactBytes ?? 0,
      errorCode,
    };
  }

  private async probe(
    onProgress?: (event: ModelDownloadProgress) => void,
  ): Promise<ModelBundleState> {
    this.cancelled = false;
    try {
      const manifest = await this.loadManifest();
      const files = resolveWebModelFiles(manifest, this.config.baseUrl);
      let verifiedBytes = 0;
      for (const part of files.parts) {
        if (this.cancelled) {
          return this.failed('DOWNLOAD_CANCELLED', manifest);
        }
        const response = await this.dependencies.fetch(part.resolvedUrl, {
          method: 'HEAD',
          cache: 'no-store',
        });
        if (!response.ok) {
          return this.failed('LOCAL_MODEL_SERVER_UNAVAILABLE', manifest);
        }
        const contentLength = response.headers.get('content-length');
        if (contentLength !== null && Number(contentLength) !== part.bytes) {
          return this.failed('MODEL_CHECKSUM_MISMATCH', manifest);
        }
        verifiedBytes += part.bytes;
        onProgress?.({
          phase: 'verifying',
          downloadedBytes: verifiedBytes,
          totalBytes: manifest.artifactBytes,
        });
      }
      return {
        status: 'ready',
        modelId: manifest.modelId,
        modelVersion: manifest.modelVersion,
        downloadedBytes: manifest.artifactBytes,
        totalBytes: manifest.artifactBytes,
      };
    } catch {
      return this.failed('LOCAL_MODEL_SERVER_UNAVAILABLE');
    }
  }

  getState(): Promise<ModelBundleState> {
    return this.probe();
  }

  start(onProgress: (event: ModelDownloadProgress) => void): Promise<ModelBundleState> {
    return this.installLocal(onProgress);
  }

  installLocal(onProgress: (event: ModelDownloadProgress) => void): Promise<ModelBundleState> {
    return this.probe(onProgress);
  }

  async cancel(): Promise<ModelBundleState> {
    this.cancelled = true;
    return this.failed('DOWNLOAD_CANCELLED');
  }

  async resolveFiles(): Promise<WebModelFiles> {
    return resolveWebModelFiles(await this.loadManifest(), this.config.baseUrl);
  }
}

export function createWebModelBundleManager(
  config: WebModelConfig,
  dependencies: WebModelBundleDependencies = { fetch: globalThis.fetch.bind(globalThis) },
): WebModelBundleManager {
  return new WebModelBundleManager(config, dependencies);
}
