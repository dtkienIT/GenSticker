import { WebStickerAssetRepository } from './assets/webStickerAssetRepository';
import { LocalDiagnostics } from './diagnostics/localDiagnostics';
import { WebPlatformAssetExporter } from './export/webPlatformAssetExporter';
import { MockOnDeviceStickerGenerator } from './generation/mockOnDeviceStickerGenerator';
import { resolveMockOutput } from './generation/mockOutputResolver';
import { StickerGenerationCoordinator } from './generation/stickerGenerationCoordinator';
import type { MockScenario, OnDeviceStickerGenerator } from './generation/types';
import { detectWebCapabilities } from './generation/web/webCapabilities';
import { WebOnDeviceStickerGenerator } from './generation/web/webOnDeviceStickerGenerator';
import type { StickerRuntimeMode } from './runtimeMode';
import { LocalPromptSafetyEvaluator } from './safety/localPromptSafetyEvaluator';
import { StaticModelBundleManager } from './setup/staticModelBundleManager';
import { createWebModelBundleManager } from './setup/web/webModelBundleManager';

export type { StickerRuntimeMode } from './runtimeMode';

export function getStickerRuntimeMode(): StickerRuntimeMode {
  return process.env.EXPO_PUBLIC_STICKER_RUNTIME === 'mock' ? 'mock' : 'web';
}

const mockGenerator = new MockOnDeviceStickerGenerator({
  platform: 'web',
  outputResolver: resolveMockOutput,
});

const modelSource = process.env.EXPO_PUBLIC_WEB_MODEL_SOURCE === 'cache' ? 'cache' : 'local';
const webModelBundle = createWebModelBundleManager({
  source: modelSource,
  baseUrl: process.env.EXPO_PUBLIC_WEB_MODEL_BASE_URL ?? 'http://127.0.0.1:8790/',
});
const webGenerator = new WebOnDeviceStickerGenerator({
  resolveModelFiles: () => webModelBundle.resolveFiles(),
  getCapabilities: () =>
    detectWebCapabilities(
      modelSource === 'local'
        ? {
            isSecureContext: globalThis.isSecureContext,
            userAgent: globalThis.navigator.userAgent,
            requestAdapter: () =>
              globalThis.navigator.gpu?.requestAdapter() ?? Promise.resolve(null),
            estimateStorage: () =>
              globalThis.navigator.storage?.estimate?.() ?? Promise.resolve({}),
            minimumStorageBytes: 0,
          }
        : undefined,
    ),
});
const generator: OnDeviceStickerGenerator =
  getStickerRuntimeMode() === 'mock' ? mockGenerator : webGenerator;
const modelBundle =
  getStickerRuntimeMode() === 'mock' ? new StaticModelBundleManager() : webModelBundle;

const repository = new WebStickerAssetRepository({
  releaseTemporaryUri: (uri) => webGenerator.releaseTemporaryOutput(uri),
});

const safety = new LocalPromptSafetyEvaluator({
  getScenario: () => mockGenerator.getScenario(),
});
const coordinator = new StickerGenerationCoordinator({
  safety,
  generator,
  repository,
  createRequestId: () => `request-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  createSeed: () => Math.floor(Math.random() * 2_147_483_647),
});
const exporter = new WebPlatformAssetExporter();
const diagnostics = new LocalDiagnostics();

export const stickerServices = {
  generator,
  modelBundle,
  repository,
  coordinator,
  exporter,
  diagnostics,
};

export function setMockScenario(scenario: MockScenario): void {
  mockGenerator.setScenario(scenario);
}

export function getMockScenario(): MockScenario {
  return mockGenerator.getScenario();
}
