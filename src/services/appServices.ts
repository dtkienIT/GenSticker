import { Asset as MediaAsset, requestPermissionsAsync } from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import {
  AsyncStorageGalleryMetadata,
  ExpoStickerFileStore,
  stickerAssetDirectory,
} from './assets/expoAssetInfrastructure';
import { LocalStickerAssetRepository } from './assets/localStickerAssetRepository';
import { ExpoPlatformAssetExporter } from './export/expoPlatformAssetExporter';
import { MockOnDeviceStickerGenerator } from './generation/mockOnDeviceStickerGenerator';
import { resolveMockOutput } from './generation/mockOutputResolver';
import { StickerGenerationCoordinator } from './generation/stickerGenerationCoordinator';
import type { MockScenario, OnDeviceStickerGenerator } from './generation/types';
import { UnavailableOnDeviceStickerGenerator } from './generation/unavailableOnDeviceStickerGenerator';
import { LocalPromptSafetyEvaluator } from './safety/localPromptSafetyEvaluator';

export type StickerRuntimeMode = 'mock' | 'native';

export function getStickerRuntimeMode(): StickerRuntimeMode {
  return process.env.EXPO_PUBLIC_STICKER_RUNTIME === 'native' ? 'native' : 'mock';
}

function createRequestId(): string {
  return `request-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createAssetId(): string {
  return `sticker-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const mockGenerator = new MockOnDeviceStickerGenerator({
  platform: process.env.EXPO_OS ?? 'web',
  outputResolver: resolveMockOutput,
});

const generator: OnDeviceStickerGenerator =
  getStickerRuntimeMode() === 'mock' ? mockGenerator : new UnavailableOnDeviceStickerGenerator();

const repository = new LocalStickerAssetRepository({
  assetRootUri: stickerAssetDirectory.uri,
  files: new ExpoStickerFileStore(),
  metadata: new AsyncStorageGalleryMetadata(),
  createAssetId,
  now: () => new Date().toISOString(),
  shouldFailWrites: () => mockGenerator.getScenario() === 'storage_failure',
});

const safety = new LocalPromptSafetyEvaluator({ getScenario: () => mockGenerator.getScenario() });

const coordinator = new StickerGenerationCoordinator({
  safety,
  generator,
  repository,
  createRequestId,
  createSeed: () => Math.floor(Math.random() * 2_147_483_647),
});

const exporter = new ExpoPlatformAssetExporter({
  requestPhotoPermission: () => requestPermissionsAsync(true, []),
  createMediaAsset: (localUri) => MediaAsset.create(localUri),
  isSharingAvailable: () => Sharing.isAvailableAsync(),
  shareFile: (localUri, mimeType) =>
    Sharing.shareAsync(localUri, { mimeType, dialogTitle: 'Share sticker' }),
  getScenario: () => mockGenerator.getScenario(),
});

export const stickerServices = {
  generator,
  repository,
  coordinator,
  exporter,
};

export function setMockScenario(scenario: MockScenario): void {
  mockGenerator.setScenario(scenario);
}

export function getMockScenario(): MockScenario {
  return mockGenerator.getScenario();
}
