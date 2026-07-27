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
