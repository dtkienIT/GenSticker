import { mockStickerService, StickerGenerationService } from '../mock/mockStickerService';
import { localApiStickerService } from './localApiClient';

export function getStickerGenerationService(): StickerGenerationService {
  const useMock = process.env.EXPO_PUBLIC_USE_MOCK_SERVICE === 'true';
  return useMock ? mockStickerService : localApiStickerService;
}
