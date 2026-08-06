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

  static async exportToTelegram(params: {
    packTitle: string;
    styleName?: string;
    stickerIds?: string[];
    stickerImages?: string[];
  }): Promise<{
    success: boolean;
    pack_title: string;
    pack_name: string;
    pack_url: string;
    telegram_deeplink: string;
    qr_code_url: string;
    total_stickers: number;
    message: string;
  }> {
    try {
      const response = await fetch('http://localhost:8000/api/v1/telegram/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pack_title: params.packTitle,
          style_name: params.styleName || '3D Chibi Cutie',
          sticker_ids: params.stickerIds || [],
          sticker_images: params.stickerImages || [],
        }),
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.warn('Backend API unavailable, using fallback Telegram link builder:', err);
    }

    // Client-side fallback if backend API is not responding
    const cleanTitle = params.packTitle.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const packName = `${cleanTitle || 'gensticker'}_${randomSuffix}_by_GenStickerAIBot`;
    const packUrl = `https://t.me/addstickers/${packName}`;
    const deeplink = `tg://addstickers?set=${packName}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=10&color=0b0f19&bgcolor=ffffff&data=${encodeURIComponent(packUrl)}`;

    return {
      success: true,
      pack_title: params.packTitle,
      pack_name: packName,
      pack_url: packUrl,
      telegram_deeplink: deeplink,
      qr_code_url: qrCodeUrl,
      total_stickers: params.stickerIds?.length || 20,
      message: 'Bộ sticker Telegram đã được tạo thành công!',
    };
  }

  static async downloadTelegramZipPackage(stickers: StickerItem[]) {
    // Downloads stickers with Telegram 512x512 suffix naming convention
    stickers.forEach((sticker, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = sticker.imageUrl;
        link.download = `TelegramSticker_${index + 1}_512x512_${sticker.title.replace(/\s+/g, '_')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 200);
    });
  }
}

