import type { StickerRuntimeMode } from '@/services/runtimeMode';

type CapabilityStatus = 'checking' | 'ready' | 'unsupported' | 'failed';

export function runtimeStatusCopy(mode: StickerRuntimeMode, status: CapabilityStatus): string {
  if (status === 'checking') return 'Checking local generation support…';
  if (status !== 'ready') return 'Local generation is not available with the current runtime.';
  if (mode === 'web') return 'Ready. Generation runs locally in this browser.';
  if (mode === 'native') return 'Ready. Generation runs locally on this device.';
  return 'Ready with the deterministic local mock.';
}

export function workspaceLayout(width: number): {
  direction: 'row' | 'column';
  promptFlex: number;
  sideFlex: number;
} {
  return width >= 1024
    ? { direction: 'row', promptFlex: 3, sideFlex: 2 }
    : { direction: 'column', promptFlex: 1, sideFlex: 1 };
}
