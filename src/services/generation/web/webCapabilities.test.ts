import { describe, expect, it, vi } from 'vitest';
import {
  detectWebCapabilities,
  MINIMUM_WEB_MODEL_STORAGE_BYTES,
  type CapabilityDependencies,
} from './webCapabilities';

function dependencies(overrides: Partial<CapabilityDependencies> = {}): CapabilityDependencies {
  return {
    isSecureContext: true,
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36',
    requestAdapter: vi.fn(async () => ({
      features: new Set(['shader-f16']),
      info: { vendor: 'test-vendor', architecture: 'test-gpu' },
    })),
    estimateStorage: vi.fn(async () => ({
      quota: MINIMUM_WEB_MODEL_STORAGE_BYTES * 2,
      usage: 0,
    })),
    ...overrides,
  };
}

describe('detectWebCapabilities', () => {
  it('rejects an insecure browsing context', async () => {
    await expect(
      detectWebCapabilities(dependencies({ isSecureContext: false })),
    ).resolves.toMatchObject({
      supported: false,
      reasonCode: 'RUNTIME_UNAVAILABLE',
      detailCode: 'INSECURE_CONTEXT',
    });
  });

  it('rejects non-Chromium browsers before requesting an adapter', async () => {
    const requestAdapter = vi.fn();

    await expect(
      detectWebCapabilities(
        dependencies({
          userAgent: 'Mozilla/5.0 Firefox/141.0',
          requestAdapter,
        }),
      ),
    ).resolves.toMatchObject({
      supported: false,
      reasonCode: 'DEVICE_UNSUPPORTED',
      detailCode: 'UNSUPPORTED_BROWSER',
    });
    expect(requestAdapter).not.toHaveBeenCalled();
  });

  it('rejects a missing WebGPU adapter', async () => {
    await expect(
      detectWebCapabilities(dependencies({ requestAdapter: vi.fn(async () => null) })),
    ).resolves.toMatchObject({
      supported: false,
      reasonCode: 'RUNTIME_UNAVAILABLE',
      detailCode: 'WEBGPU_UNAVAILABLE',
    });
  });

  it('requires shader-f16 support', async () => {
    await expect(
      detectWebCapabilities(
        dependencies({
          requestAdapter: vi.fn(async () => ({
            features: new Set<string>(),
          })),
        }),
      ),
    ).resolves.toMatchObject({
      supported: false,
      reasonCode: 'DEVICE_UNSUPPORTED',
      detailCode: 'FP16_UNAVAILABLE',
    });
  });

  it('rejects storage below the model installation minimum', async () => {
    await expect(
      detectWebCapabilities(
        dependencies({
          estimateStorage: vi.fn(async () => ({
            quota: MINIMUM_WEB_MODEL_STORAGE_BYTES,
            usage: 1,
          })),
        }),
      ),
    ).resolves.toMatchObject({
      supported: false,
      reasonCode: 'INSUFFICIENT_MEMORY',
      detailCode: 'INSUFFICIENT_STORAGE',
    });
  });

  it('returns the selected WebGPU adapter for supported Chromium', async () => {
    await expect(detectWebCapabilities(dependencies())).resolves.toMatchObject({
      supported: true,
      adapterId: 'onnxruntime-web-webgpu',
      selectedDelegate: 'WebGPU',
      availableDelegates: ['WebGPU'],
      architecture: 'test-gpu',
    });
  });
});
