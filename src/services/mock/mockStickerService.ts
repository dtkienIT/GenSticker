import {
  GeneratedSticker,
  GenerationProgress,
  StickerGenerationRequest,
} from '../../types/sticker';
import { MOCK_STICKER_IMAGES } from '../../constants/mockAssets';

export interface StickerGenerationService {
  generateSticker(
    request: StickerGenerationRequest,
    onProgress?: (progress: GenerationProgress) => void,
  ): Promise<GeneratedSticker>;
}

export interface MockServiceConfig {
  simulatedDelayMs?: number;
  failureRate?: number; // 0.0 to 1.0 (default 0)
}

export class MockStickerGenerationService implements StickerGenerationService {
  private config: MockServiceConfig;

  constructor(config: MockServiceConfig = {}) {
    this.config = {
      simulatedDelayMs: config.simulatedDelayMs ?? 3000,
      failureRate: config.failureRate ?? 0,
    };
  }

  async generateSticker(
    request: StickerGenerationRequest,
    onProgress?: (progress: GenerationProgress) => void,
  ): Promise<GeneratedSticker> {
    const steps: GenerationProgress[] = [
      { step: 'Preparing prompt...', progressPercent: 20 },
      { step: 'Generating AI character...', progressPercent: 50 },
      { step: 'Removing background...', progressPercent: 80 },
      { step: 'Finalizing sticker...', progressPercent: 100 },
    ];

    const stepDuration = Math.floor((this.config.simulatedDelayMs ?? 3000) / steps.length);

    for (let i = 0; i < steps.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, stepDuration));
      if (onProgress) {
        onProgress(steps[i]);
      }
    }

    // Check simulated failure
    if (this.config.failureRate && Math.random() < this.config.failureRate) {
      throw new Error('Simulated AI model generation failure. Please try again!');
    }

    const mockImageUri = MOCK_STICKER_IMAGES[request.style] || MOCK_STICKER_IMAGES.chibi;

    const generated: GeneratedSticker = {
      id: `sticker_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      imageUri: mockImageUri,
      mode: request.mode,
      prompt: request.prompt,
      sourceImageUri: request.sourceImageUri,
      style: request.style,
      emotion: request.emotion,
      stickerText: request.stickerText,
      createdAt: new Date().toISOString(),
    };

    return generated;
  }
}

export const mockStickerService = new MockStickerGenerationService();
