import type { StickerItem, StickerStyleId, ProcessStep } from '../types/sticker';
import { MOCK_20_STICKERS, INITIAL_PIPELINE_STEPS, STICKER_STYLES } from '../mock/mockStickers';

export interface StickerGenerationParams {
  imageFile: File;
  styleId: StickerStyleId;
  onStepProgress?: (stepIndex: number, step: ProcessStep, overallProgress: number) => void;
}

export class StickerService {
  static async generateStickers({
    imageFile,
    styleId,
    onStepProgress,
  }: StickerGenerationParams): Promise<StickerItem[]> {
    console.log(`Starting mock generation for file: ${imageFile.name} with style: ${styleId}`);

    const steps = JSON.parse(JSON.stringify(INITIAL_PIPELINE_STEPS)) as ProcessStep[];
    const totalSteps = steps.length;

    for (let i = 0; i < totalSteps; i++) {
      const step = steps[i];
      step.status = 'processing';
      step.progress = 10;
      
      const currentOverallProgress = Math.round((i / totalSteps) * 100);
      onStepProgress?.(i, step, currentOverallProgress);

      const stepDuration = step.estimatedTimeSec * 1000;
      const intervalMs = 200;
      const totalTicks = stepDuration / intervalMs;
      
      for (let tick = 1; tick <= totalTicks; tick++) {
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
        const subProgress = Math.min(100, Math.round((tick / totalTicks) * 100));
        step.progress = subProgress;

        const overall = Math.min(
          99,
          Math.round(((i + subProgress / 100) / totalSteps) * 100)
        );
        onStepProgress?.(i, step, overall);
      }

      step.status = 'completed';
      step.progress = 100;
      onStepProgress?.(i, step, Math.round(((i + 1) / totalSteps) * 100));
    }

    const selectedStyleObj = STICKER_STYLES.find((s) => s.id === styleId);
    const styleName = selectedStyleObj ? selectedStyleObj.name : 'Custom AI';

    const resultStickers: StickerItem[] = MOCK_20_STICKERS.map((st) => ({
      ...st,
      style: styleId,
      styleName: styleName,
    }));

    return resultStickers;
  }

  static downloadSticker(sticker: StickerItem) {
    const link = document.createElement('a');
    link.href = sticker.imageUrl;
    link.download = `GenSticker-${sticker.title.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  static async downloadAllStickers(stickers: StickerItem[]) {
    stickers.forEach((sticker, index) => {
      setTimeout(() => {
        this.downloadSticker(sticker);
      }, index * 250);
    });
  }
}
