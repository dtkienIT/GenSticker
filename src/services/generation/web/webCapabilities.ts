import type { WebCapabilityDetailCode } from '../../diagnostics/types';
import type { DeviceCapabilityResult } from '../types';

export const MINIMUM_WEB_MODEL_STORAGE_BYTES = 2_500_000_000;

interface AdapterLike {
  features: ReadonlySet<string>;
  info?: {
    architecture?: string;
    vendor?: string;
  };
}

interface StorageEstimateLike {
  quota?: number;
  usage?: number;
}

export interface CapabilityDependencies {
  isSecureContext: boolean;
  userAgent: string;
  requestAdapter: () => Promise<AdapterLike | null>;
  estimateStorage: () => Promise<StorageEstimateLike>;
  minimumStorageBytes?: number;
}

export type WebCapabilitySnapshot =
  | (Extract<DeviceCapabilityResult, { supported: true }> & {
      detailCode?: never;
      storageAvailableBytes?: number;
    })
  | (Extract<DeviceCapabilityResult, { supported: false }> & {
      detailCode: WebCapabilityDetailCode;
      storageAvailableBytes?: number;
    });

function unsupported(
  reasonCode: Extract<DeviceCapabilityResult, { supported: false }>['reasonCode'],
  detailCode: WebCapabilityDetailCode,
  storageAvailableBytes?: number,
): WebCapabilitySnapshot {
  return {
    supported: false,
    reasonCode,
    detailCode,
    ...(storageAvailableBytes === undefined ? {} : { storageAvailableBytes }),
  };
}

function isSupportedChromium(userAgent: string): boolean {
  const hasChromiumEngine = /\b(?:Chrome|Chromium|Edg|CriOS)\/\d+/i.test(userAgent);
  const isKnownAlternative = /\b(?:Firefox|FxiOS|OPR|SamsungBrowser)\//i.test(userAgent);
  return hasChromiumEngine && !isKnownAlternative;
}

function browserDependencies(): CapabilityDependencies {
  const browserNavigator = navigator;

  return {
    isSecureContext: globalThis.isSecureContext,
    userAgent: browserNavigator.userAgent,
    requestAdapter: async () => {
      if (!browserNavigator.gpu) {
        return null;
      }
      return browserNavigator.gpu.requestAdapter();
    },
    estimateStorage: async () => browserNavigator.storage?.estimate?.() ?? {},
  };
}

export async function detectWebCapabilities(
  dependencies: CapabilityDependencies = browserDependencies(),
): Promise<WebCapabilitySnapshot> {
  if (!dependencies.isSecureContext) {
    return unsupported('RUNTIME_UNAVAILABLE', 'INSECURE_CONTEXT');
  }

  if (!isSupportedChromium(dependencies.userAgent)) {
    return unsupported('DEVICE_UNSUPPORTED', 'UNSUPPORTED_BROWSER');
  }

  const adapter = await dependencies.requestAdapter();
  if (!adapter) {
    return unsupported('RUNTIME_UNAVAILABLE', 'WEBGPU_UNAVAILABLE');
  }

  if (!adapter.features.has('shader-f16')) {
    return unsupported('DEVICE_UNSUPPORTED', 'FP16_UNAVAILABLE');
  }

  const estimate = await dependencies.estimateStorage();
  const availableBytes =
    estimate.quota === undefined ? undefined : Math.max(0, estimate.quota - (estimate.usage ?? 0));
  const minimumStorageBytes = dependencies.minimumStorageBytes ?? MINIMUM_WEB_MODEL_STORAGE_BYTES;

  if (availableBytes !== undefined && availableBytes < minimumStorageBytes) {
    return unsupported('INSUFFICIENT_MEMORY', 'INSUFFICIENT_STORAGE', availableBytes);
  }

  return {
    supported: true,
    adapterId: 'onnxruntime-web-webgpu',
    architecture: adapter.info?.architecture,
    availableDelegates: ['WebGPU'],
    selectedDelegate: 'WebGPU',
    runtimeVersion: 'onnxruntime-web-1.27.0',
    storageAvailableBytes: availableBytes,
  };
}
