import type { ModelBundleManager, ModelBundleState, ModelDownloadProgress } from '../types';
import { createDigestingStream } from './incrementalDigest';
import {
  parseWebModelManifest,
  resolveWebModelFiles,
  WEB_MODEL_ID,
  WEB_MODEL_VERSION,
  type WebModelFiles,
  type WebModelManifest,
} from './webModelManifest';

export const WEB_MODEL_CACHE_NAME = 'gensticker-model-lcm-sd15-chibi-1.0.1';
export const WEB_MODEL_ACTIVE_KEY = '@gensticker/web-model/active';

export interface WebModelConfig {
  source: 'local' | 'cache';
  baseUrl: string;
}

interface CacheLike {
  match(request: RequestInfo | URL): Promise<Response | undefined>;
  put(request: RequestInfo | URL, response: Response): Promise<void>;
  delete(request: RequestInfo | URL): Promise<boolean>;
}

interface CacheStorageLike {
  open(cacheName: string): Promise<CacheLike>;
  delete(cacheName: string): Promise<boolean>;
}

interface ActiveMetadataStore {
  get(): Promise<{ modelId: string; modelVersion: string } | null | undefined>;
  set(value: { modelId: string; modelVersion: string }): Promise<void>;
  delete(): Promise<void>;
}

export interface WebModelBundleDependencies {
  fetch: typeof fetch;
  loadManifest?: () => Promise<WebModelManifest>;
  cacheStorage?: CacheStorageLike;
  estimateStorage?: () => Promise<{ quota?: number; usage?: number }>;
  persistStorage?: () => Promise<boolean>;
  activeMetadata?: ActiveMetadataStore;
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
  private abortController: AbortController | null = null;

  constructor(
    private readonly config: WebModelConfig,
    private readonly dependencies: WebModelBundleDependencies,
  ) {}

  private async loadManifest(): Promise<WebModelManifest> {
    if (this.manifest) return this.manifest;
    if (this.dependencies.loadManifest) {
      this.manifest = await this.dependencies.loadManifest();
      return this.manifest;
    }
    const manifestUrl = new URL('model-distribution.manifest.json', this.config.baseUrl).href;
    const response = await this.dependencies.fetch(manifestUrl, { cache: 'no-store' });
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

  private async probeLocal(
    onProgress?: (event: ModelDownloadProgress) => void,
  ): Promise<ModelBundleState> {
    this.cancelled = false;
    try {
      const manifest = await this.loadManifest();
      const files = resolveWebModelFiles(manifest, this.config.baseUrl);
      let verifiedBytes = 0;
      for (const part of files.parts) {
        if (this.cancelled) return this.failed('DOWNLOAD_CANCELLED', manifest);
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
      return this.ready(manifest);
    } catch {
      return this.failed('LOCAL_MODEL_SERVER_UNAVAILABLE');
    }
  }

  private ready(manifest: WebModelManifest): ModelBundleState {
    return {
      status: 'ready',
      modelId: manifest.modelId,
      modelVersion: manifest.modelVersion,
      downloadedBytes: manifest.artifactBytes,
      totalBytes: manifest.artifactBytes,
    };
  }

  private cacheStorage(): CacheStorageLike {
    if (this.dependencies.cacheStorage) return this.dependencies.cacheStorage;
    if (!globalThis.caches) throw new Error('Cache Storage is unavailable');
    return globalThis.caches;
  }

  private activeMetadata(): ActiveMetadataStore {
    if (this.dependencies.activeMetadata) return this.dependencies.activeMetadata;
    return {
      get: async () => {
        const raw = globalThis.localStorage?.getItem(WEB_MODEL_ACTIVE_KEY);
        return raw ? (JSON.parse(raw) as { modelId: string; modelVersion: string }) : null;
      },
      set: async (value) => {
        globalThis.localStorage?.setItem(WEB_MODEL_ACTIVE_KEY, JSON.stringify(value));
      },
      delete: async () => {
        globalThis.localStorage?.removeItem(WEB_MODEL_ACTIVE_KEY);
      },
    };
  }

  private async getCachedState(): Promise<ModelBundleState> {
    try {
      const manifest = await this.loadManifest();
      const active = await this.activeMetadata().get();
      return active?.modelId === manifest.modelId && active.modelVersion === manifest.modelVersion
        ? this.ready(manifest)
        : {
            status: 'missing',
            modelId: manifest.modelId,
            modelVersion: manifest.modelVersion,
            downloadedBytes: 0,
            totalBytes: manifest.artifactBytes,
          };
    } catch {
      return this.failed('DOWNLOAD_FAILED');
    }
  }

  private async installCached(
    onProgress: (event: ModelDownloadProgress) => void,
  ): Promise<ModelBundleState> {
    this.cancelled = false;
    this.abortController = new AbortController();
    let activeUrl: string | null = null;
    try {
      const manifest = await this.loadManifest();
      const estimateStorage =
        this.dependencies.estimateStorage ??
        (() => globalThis.navigator.storage?.estimate?.() ?? Promise.resolve({}));
      const estimate = await estimateStorage();
      const available =
        estimate.quota === undefined
          ? undefined
          : Math.max(0, estimate.quota - (estimate.usage ?? 0));
      if (available !== undefined && available < manifest.artifactBytes) {
        return this.failed('INSUFFICIENT_STORAGE', manifest);
      }
      const persistStorage =
        this.dependencies.persistStorage ??
        (() => globalThis.navigator.storage?.persist?.() ?? Promise.resolve(false));
      await persistStorage();

      const cache = await this.cacheStorage().open(WEB_MODEL_CACHE_NAME);
      const parts = manifest.parts.map((part) => ({ ...part, resolvedUrl: part.url }));
      let completedBytes = 0;
      for (const part of parts) {
        activeUrl = part.resolvedUrl;
        if (this.cancelled || this.abortController.signal.aborted) {
          return this.failed('DOWNLOAD_CANCELLED', manifest);
        }

        const cached = await cache.match(part.resolvedUrl);
        if (
          cached?.headers.get('x-gensticker-sha256') === part.sha256 &&
          Number(cached.headers.get('content-length')) === part.bytes
        ) {
          completedBytes += part.bytes;
          onProgress({
            phase: 'verifying',
            downloadedBytes: completedBytes,
            totalBytes: manifest.artifactBytes,
          });
          continue;
        }
        if (cached) await cache.delete(part.resolvedUrl);

        const response = await this.dependencies.fetch(part.resolvedUrl, {
          signal: this.abortController.signal,
        });
        if (!response.ok || !response.body) {
          return this.failed('DOWNLOAD_FAILED', manifest);
        }
        const reportedLength = response.headers.get('content-length');
        if (reportedLength !== null && Number(reportedLength) !== part.bytes) {
          return this.failed('CHECKSUM_MISMATCH', manifest);
        }

        const startingBytes = completedBytes;
        const digesting = createDigestingStream(response.body, {
          signal: this.abortController.signal,
          onChunk: (byteLength) => {
            completedBytes += byteLength;
            onProgress({
              phase: 'downloading',
              downloadedBytes: completedBytes,
              totalBytes: manifest.artifactBytes,
            });
          },
        });
        const headers = new Headers(response.headers);
        headers.set('content-length', String(part.bytes));
        headers.set('x-gensticker-sha256', part.sha256);
        await cache.put(part.resolvedUrl, new Response(digesting.stream, { status: 200, headers }));
        const digestResult = await digesting.result;
        if (digestResult.bytes !== part.bytes || digestResult.sha256 !== part.sha256) {
          await cache.delete(part.resolvedUrl);
          completedBytes = startingBytes;
          return this.failed('CHECKSUM_MISMATCH', manifest);
        }
        onProgress({
          phase: 'verifying',
          downloadedBytes: completedBytes,
          totalBytes: manifest.artifactBytes,
        });
      }

      await this.activeMetadata().set({
        modelId: manifest.modelId,
        modelVersion: manifest.modelVersion,
      });
      return this.ready(manifest);
    } catch (error) {
      if (
        this.cancelled ||
        (typeof DOMException !== 'undefined' &&
          error instanceof DOMException &&
          error.name === 'AbortError')
      ) {
        if (activeUrl) {
          const cache = await this.cacheStorage().open(WEB_MODEL_CACHE_NAME);
          await cache.delete(activeUrl);
        }
        return this.failed('DOWNLOAD_CANCELLED');
      }
      return this.failed('DOWNLOAD_FAILED');
    } finally {
      this.abortController = null;
    }
  }

  getState(): Promise<ModelBundleState> {
    return this.config.source === 'local' ? this.probeLocal() : this.getCachedState();
  }

  start(onProgress: (event: ModelDownloadProgress) => void): Promise<ModelBundleState> {
    return this.config.source === 'local'
      ? this.installLocal(onProgress)
      : this.installCached(onProgress);
  }

  installLocal(onProgress: (event: ModelDownloadProgress) => void): Promise<ModelBundleState> {
    return this.probeLocal(onProgress);
  }

  async cancel(): Promise<ModelBundleState> {
    this.cancelled = true;
    this.abortController?.abort();
    return this.failed('DOWNLOAD_CANCELLED');
  }

  async resolveFiles(): Promise<WebModelFiles> {
    return resolveWebModelFiles(
      await this.loadManifest(),
      this.config.baseUrl,
      this.config.source === 'cache',
    );
  }
}

export function createWebModelBundleManager(
  config: WebModelConfig,
  dependencies: WebModelBundleDependencies = { fetch: globalThis.fetch.bind(globalThis) },
): WebModelBundleManager {
  return new WebModelBundleManager(config, dependencies);
}
