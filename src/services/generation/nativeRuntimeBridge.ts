import { ExpoStickerRuntime } from '../../../modules/expo-sticker-runtime/src/ExpoStickerRuntime';
import type { NativeStickerRuntimeBridge } from './nativeOnDeviceStickerGenerator';
import type { NativeModelBundleBridge } from '../setup/nativeModelBundleManager';

export type StickerRuntimeBridge = NativeStickerRuntimeBridge & NativeModelBundleBridge;

export function getNativeStickerRuntimeBridge(): StickerRuntimeBridge | null {
  const runtime = ExpoStickerRuntime;
  if (!runtime) return null;
  return {
    getCapabilities: () => runtime.getCapabilities(),
    getModelBundleState: () => runtime.getModelBundleState(),
    startModelDownload: () => runtime.startModelDownload(),
    installLocalModel: () => runtime.installLocalModel(),
    cancelModelDownload: () => runtime.cancelModelDownload(),
    prepareModel: (request) => runtime.prepareModel(request),
    generate: (request) => runtime.generate(request),
    cancel: (requestId) => runtime.cancel(requestId),
    addGenerationProgressListener: (listener) =>
      runtime.addListener('onGenerationProgress', listener),
    addModelDownloadProgressListener: (listener) =>
      runtime.addListener('onModelDownloadProgress', listener),
  };
}
