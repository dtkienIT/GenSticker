import type { StickerProductService } from './contracts';
import { HttpStickerProductService } from './http/HttpStickerProductService';
import { MockStickerProductService } from './mock/MockStickerProductService';

export type StickerServiceMode = 'mock' | 'http';
export function getStickerServiceMode(): StickerServiceMode {
  if (
    process.env.EXPO_PUBLIC_STICKER_SERVICE === 'http' &&
    process.env.EXPO_PUBLIC_USE_MOCK_SERVICE !== 'true'
  )
    return 'http';
  return 'mock';
}
let instance: StickerProductService | undefined;
export function createStickerProductService(mode = getStickerServiceMode()): StickerProductService {
  return mode === 'http' ? new HttpStickerProductService() : new MockStickerProductService();
}
export function getStickerProductService(): StickerProductService {
  return (instance ??= createStickerProductService());
}
export function resetStickerProductServiceForTests(): void {
  instance = undefined;
}
