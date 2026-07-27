import { describe, expect, it, vi } from 'vitest';
import { createWebModelBundleManager } from './webModelBundleManager';
import type { WebModelManifest } from './webModelManifest';

const manifest: WebModelManifest = {
  manifestVersion: '1.0',
  modelId: 'lcm-sd15-chibi',
  modelVersion: '1.0.1',
  artifactBytes: 4,
  parts: [
    {
      name: 'runtime-config.json',
      path: 'runtime-config.json',
      bytes: 1,
      sha256: 'a'.repeat(64),
      url: 'https://example.test/runtime-config.json',
    },
    {
      name: 'scheduler',
      path: 'scheduler/scheduler_config.json',
      bytes: 1,
      sha256: 'a'.repeat(64),
      url: 'https://example.test/scheduler',
    },
    {
      name: 'text',
      path: 'text_encoder/model.onnx',
      bytes: 1,
      sha256: 'a'.repeat(64),
      url: 'https://example.test/text',
    },
    {
      name: 'tokenizer',
      path: 'tokenizer/tokenizer.json',
      bytes: 1,
      sha256: 'a'.repeat(64),
      url: 'https://example.test/tokenizer',
    },
    {
      name: 'tokenizer-config',
      path: 'tokenizer/tokenizer_config.json',
      bytes: 0,
      sha256: 'a'.repeat(64),
      url: 'https://example.test/tokenizer-config',
    },
    {
      name: 'unet',
      path: 'unet/model.onnx',
      bytes: 0,
      sha256: 'a'.repeat(64),
      url: 'https://example.test/unet',
    },
    {
      name: 'vae',
      path: 'vae_decoder/model.onnx',
      bytes: 0,
      sha256: 'a'.repeat(64),
      url: 'https://example.test/vae',
    },
    {
      name: 'segmentation',
      path: 'segmentation/u2netp.onnx',
      bytes: 0,
      sha256: 'a'.repeat(64),
      url: 'https://example.test/segmentation',
    },
  ],
};

describe('WebModelBundleManager local source', () => {
  it('probes the manifest and every model part with HEAD', async () => {
    const request = vi.fn(async () => new Response(null, { status: 200 }));
    const manager = createWebModelBundleManager(
      { source: 'local', baseUrl: 'http://127.0.0.1:8790/' },
      {
        fetch: request,
        loadManifest: vi.fn(async () => manifest),
      },
    );
    const progress = vi.fn();

    await expect(manager.installLocal(progress)).resolves.toMatchObject({
      status: 'ready',
      modelId: 'lcm-sd15-chibi',
      modelVersion: '1.0.1',
    });
    expect(request).toHaveBeenCalledTimes(manifest.parts.length);
    expect(request).toHaveBeenCalledWith(
      'http://127.0.0.1:8790/unet/model.onnx',
      expect.objectContaining({ method: 'HEAD' }),
    );
    expect(progress).toHaveBeenLastCalledWith({
      phase: 'verifying',
      downloadedBytes: manifest.artifactBytes,
      totalBytes: manifest.artifactBytes,
    });
  });

  it('maps an unreachable project model server to a stable state', async () => {
    const manager = createWebModelBundleManager(
      { source: 'local', baseUrl: 'http://127.0.0.1:8790/' },
      {
        fetch: vi.fn(async () => {
          throw new TypeError('fetch failed');
        }),
        loadManifest: vi.fn(async () => manifest),
      },
    );

    await expect(manager.getState()).resolves.toMatchObject({
      status: 'failed',
      errorCode: 'LOCAL_MODEL_SERVER_UNAVAILABLE',
    });
  });

  it('rejects model files whose reported byte length differs', async () => {
    const manager = createWebModelBundleManager(
      { source: 'local', baseUrl: 'http://127.0.0.1:8790/' },
      {
        fetch: vi.fn(
          async () => new Response(null, { status: 200, headers: { 'content-length': '999' } }),
        ),
        loadManifest: vi.fn(async () => manifest),
      },
    );

    await expect(manager.installLocal(vi.fn())).resolves.toMatchObject({
      status: 'failed',
      errorCode: 'MODEL_CHECKSUM_MISMATCH',
    });
  });
});

function memoryCacheStorage() {
  const entries = new Map<string, Response>();
  const cache = {
    match: vi.fn(async (request: RequestInfo | URL) => entries.get(String(request))?.clone()),
    put: vi.fn(async (request: RequestInfo | URL, response: Response) => {
      const body = await response.arrayBuffer();
      entries.set(
        String(request),
        new Response(body, { status: response.status, headers: response.headers }),
      );
    }),
    delete: vi.fn(async (request: RequestInfo | URL) => entries.delete(String(request))),
  };
  return {
    entries,
    cache,
    storage: {
      open: vi.fn(async () => cache),
      delete: vi.fn(async () => {
        entries.clear();
        return true;
      }),
    },
  };
}

describe('WebModelBundleManager cached source', () => {
  it('streams verified files before activating the model', async () => {
    const oneByteManifest: WebModelManifest = {
      ...manifest,
      artifactBytes: 1,
      parts: [
        {
          name: 'only',
          path: 'runtime-config.json',
          bytes: 1,
          sha256: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
          url: 'https://models.example.test/runtime-config.json',
        },
      ],
    };
    const cacheStorage = memoryCacheStorage();
    const activeMetadata = { get: vi.fn(), set: vi.fn(), delete: vi.fn() };
    const manager = createWebModelBundleManager(
      { source: 'cache', baseUrl: 'https://models.example.test/' },
      {
        fetch: vi.fn(async () => new Response('a', { headers: { 'content-length': '1' } })),
        loadManifest: vi.fn(async () => oneByteManifest),
        cacheStorage: cacheStorage.storage,
        estimateStorage: vi.fn(async () => ({ quota: 100, usage: 0 })),
        persistStorage: vi.fn(async () => true),
        activeMetadata,
      },
    );
    const progress = vi.fn();

    await expect(manager.start(progress)).resolves.toMatchObject({
      status: 'ready',
      downloadedBytes: 1,
      totalBytes: 1,
    });
    expect(cacheStorage.cache.put).toHaveBeenCalledOnce();
    expect(activeMetadata.set).toHaveBeenCalledOnce();
    expect(cacheStorage.cache.put.mock.invocationCallOrder[0]).toBeLessThan(
      activeMetadata.set.mock.invocationCallOrder[0],
    );
    expect(progress).toHaveBeenLastCalledWith({
      phase: 'verifying',
      downloadedBytes: 1,
      totalBytes: 1,
    });
  });

  it('deletes a staged response when its digest does not match', async () => {
    const badManifest: WebModelManifest = {
      ...manifest,
      artifactBytes: 1,
      parts: [{ ...manifest.parts[0], bytes: 1, sha256: '0'.repeat(64) }],
    };
    const cacheStorage = memoryCacheStorage();
    const manager = createWebModelBundleManager(
      { source: 'cache', baseUrl: 'https://models.example.test/' },
      {
        fetch: vi.fn(async () => new Response('a')),
        loadManifest: vi.fn(async () => badManifest),
        cacheStorage: cacheStorage.storage,
        estimateStorage: vi.fn(async () => ({ quota: 100, usage: 0 })),
        persistStorage: vi.fn(async () => true),
        activeMetadata: { get: vi.fn(), set: vi.fn(), delete: vi.fn() },
      },
    );

    await expect(manager.start(vi.fn())).resolves.toMatchObject({
      status: 'failed',
      errorCode: 'CHECKSUM_MISMATCH',
    });
    expect(cacheStorage.cache.delete).toHaveBeenCalledOnce();
  });

  it('reuses a previously verified cached part', async () => {
    const oneByteManifest: WebModelManifest = {
      ...manifest,
      artifactBytes: 1,
      parts: [
        {
          name: 'only',
          path: 'runtime-config.json',
          bytes: 1,
          sha256: 'ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb',
          url: 'https://models.example.test/runtime-config.json',
        },
      ],
    };
    const cacheStorage = memoryCacheStorage();
    cacheStorage.entries.set(
      oneByteManifest.parts[0].url,
      new Response('a', {
        headers: {
          'content-length': '1',
          'x-gensticker-sha256': oneByteManifest.parts[0].sha256,
        },
      }),
    );
    const request = vi.fn();
    const manager = createWebModelBundleManager(
      { source: 'cache', baseUrl: 'https://models.example.test/' },
      {
        fetch: request,
        loadManifest: vi.fn(async () => oneByteManifest),
        cacheStorage: cacheStorage.storage,
        estimateStorage: vi.fn(async () => ({ quota: 100, usage: 0 })),
        persistStorage: vi.fn(async () => true),
        activeMetadata: { get: vi.fn(), set: vi.fn(), delete: vi.fn() },
      },
    );

    await expect(manager.start(vi.fn())).resolves.toMatchObject({ status: 'ready' });
    expect(request).not.toHaveBeenCalled();
    expect(cacheStorage.cache.put).not.toHaveBeenCalled();
  });

  it('aborts an active cached-model request when cancelled', async () => {
    const oneByteManifest: WebModelManifest = {
      ...manifest,
      artifactBytes: 1,
      parts: [{ ...manifest.parts[0], bytes: 1 }],
    };
    const cacheStorage = memoryCacheStorage();
    const request = vi.fn(
      async (_url: RequestInfo | URL, init?: RequestInit): Promise<Response> =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('cancelled', 'AbortError')),
          );
        }),
    );
    const manager = createWebModelBundleManager(
      { source: 'cache', baseUrl: 'https://models.example.test/' },
      {
        fetch: request as typeof fetch,
        loadManifest: vi.fn(async () => oneByteManifest),
        cacheStorage: cacheStorage.storage,
        estimateStorage: vi.fn(async () => ({ quota: 100, usage: 0 })),
        persistStorage: vi.fn(async () => true),
        activeMetadata: { get: vi.fn(), set: vi.fn(), delete: vi.fn() },
      },
    );

    const installation = manager.start(vi.fn());
    await vi.waitFor(() => expect(request).toHaveBeenCalledOnce());
    await manager.cancel();

    await expect(installation).resolves.toMatchObject({
      status: 'failed',
      errorCode: 'DOWNLOAD_CANCELLED',
    });
  });

  it('fails before downloading when quota is insufficient', async () => {
    const cacheStorage = memoryCacheStorage();
    const request = vi.fn();
    const manager = createWebModelBundleManager(
      { source: 'cache', baseUrl: 'https://models.example.test/' },
      {
        fetch: request,
        loadManifest: vi.fn(async () => manifest),
        cacheStorage: cacheStorage.storage,
        estimateStorage: vi.fn(async () => ({ quota: 3, usage: 0 })),
        persistStorage: vi.fn(async () => false),
        activeMetadata: { get: vi.fn(), set: vi.fn(), delete: vi.fn() },
      },
    );

    await expect(manager.start(vi.fn())).resolves.toMatchObject({
      status: 'failed',
      errorCode: 'INSUFFICIENT_STORAGE',
    });
    expect(request).not.toHaveBeenCalled();
  });
});
