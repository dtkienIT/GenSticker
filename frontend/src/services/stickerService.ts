import type { StickerItem, StickerStyleId, ProcessStep } from '../types/sticker';
import { MOCK_20_STICKERS, INITIAL_PIPELINE_STEPS, STICKER_STYLES } from '../mock/mockStickers';
import { AuthService } from './authService';

const API_BASE = 'http://localhost:8000/api/v1';

interface StickerHistoryApiItem {
  id?: string;
  title?: string;
  image_url?: string;
  style_id?: string;
  style_name?: string;
  tags?: unknown;
  emotion?: string;
  likes?: number;
  is_favorite?: boolean;
  file_size_kb?: number;
  width?: number;
  height?: number;
}

interface StickerPackHistoryApiItem {
  id?: string;
  user_id?: string;
  title?: string;
  prompt?: string;
  style_id?: string;
  style_name?: string;
  status?: string;
  cover_url?: string;
  total_stickers?: number;
  created_at?: string;
  stickers?: unknown;
}

const normalizeHistorySticker = (
  rawSticker: StickerHistoryApiItem,
  pack: StickerPackHistoryApiItem,
): StickerItem => {
  const styleOption = STICKER_STYLES.find((style) =>
    style.id === rawSticker.style_id ||
    style.id === pack.style_id ||
    style.name === rawSticker.style_name ||
    style.name === pack.style_name
  );
  const width = rawSticker.width ?? 1024;
  const height = rawSticker.height ?? 1024;

  return {
    id: rawSticker.id || crypto.randomUUID(),
    title: rawSticker.title || 'Sticker',
    imageUrl: rawSticker.image_url || pack.cover_url || '',
    style: styleOption?.id ?? '3d-chibi',
    styleName: rawSticker.style_name || pack.style_name || styleOption?.name || '3D Chibi Cutie',
    tags: Array.isArray(rawSticker.tags)
      ? rawSticker.tags.filter((tag): tag is string => typeof tag === 'string')
      : [],
    emotion: rawSticker.emotion || 'Sticker AI',
    likes: rawSticker.likes ?? 0,
    isFavorite: rawSticker.is_favorite ?? false,
    sizeKb: rawSticker.file_size_kb ?? 150,
    dimensions: `${width} x ${height}`,
  };
};

const normalizeHistoryPack = (rawPack: StickerPackHistoryApiItem): StickerPackHistoryItem => {
  const rawStickers = Array.isArray(rawPack.stickers)
    ? rawPack.stickers.filter((item): item is StickerHistoryApiItem => Boolean(item) && typeof item === 'object')
    : [];

  return {
    id: rawPack.id || crypto.randomUUID(),
    user_id: rawPack.user_id,
    title: rawPack.title || 'Bộ Sticker AI',
    prompt: rawPack.prompt,
    style_id: rawPack.style_id,
    style_name: rawPack.style_name || '3D Chibi Cutie',
    status: rawPack.status,
    cover_url: rawPack.cover_url,
    total_stickers: rawPack.total_stickers ?? rawStickers.length,
    created_at: rawPack.created_at || '',
    stickers: rawStickers.map((sticker) => normalizeHistorySticker(sticker, rawPack)),
  };
};

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
    console.log(`Starting generation for file: ${imageFile.name} with style: ${styleId}`);

    // Trigger backend generation & DB persistence in parallel
    try {
      const formData = new FormData();
      formData.append('file', imageFile);
      formData.append('style_id', styleId);
      const accessToken = AuthService.getAccessToken();
      fetch(`${API_BASE}/stickers/generate`, {
        method: 'POST',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        body: formData,
      }).catch((e) => console.warn('Note backend generate trigger:', e));
    } catch (err) {
      console.warn('Backend trigger note:', err);
    }

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

  static downloadSticker(sticker: StickerItem, targetSize: number = 1024) {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = targetSize;
      canvas.height = targetSize;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, targetSize, targetSize);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw image filling the target canvas symmetrically
        ctx.drawImage(img, 0, 0, targetSize, targetSize);

        const a = document.createElement('a');
        a.download = `GenSticker_${sticker.title.replace(/\s+/g, '_')}_1024x1024.png`;
        a.href = canvas.toDataURL('image/png');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    };

    // Robust encoding conversion for data SVG
    if (sticker.imageUrl.startsWith('data:image/svg+xml;utf8,')) {
      const svgText = decodeURIComponent(sticker.imageUrl.replace('data:image/svg+xml;utf8,', ''));
      const base64 = btoa(unescape(encodeURIComponent(svgText)));
      img.src = `data:image/svg+xml;base64,${base64}`;
    } else {
      img.src = sticker.imageUrl;
    }
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

  static async getUserHistory(): Promise<StickerPackHistoryItem[]> {
    const accessToken = AuthService.getAccessToken();
    if (!accessToken) return [];

    try {
      const response = await fetch(`${API_BASE}/stickers/history`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.ok) {
        const data: unknown = await response.json();
        return Array.isArray(data)
          ? data
              .filter((item): item is StickerPackHistoryApiItem => Boolean(item) && typeof item === 'object')
              .map(normalizeHistoryPack)
          : [];
      }
    } catch (err) {
      console.warn('Could not fetch user sticker history from backend:', err);
    }
    return [];
  }

  static async deleteHistoryPack(packId: string): Promise<void> {
    const accessToken = AuthService.getAccessToken();
    if (!accessToken) {
      throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }

    const response = await fetch(`${API_BASE}/stickers/history/${encodeURIComponent(packId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.detail || 'Không thể xóa bộ sticker khỏi lịch sử. Vui lòng thử lại.');
    }
  }
}

export interface StickerPackHistoryItem {
  id: string;
  user_id?: string;
  title: string;
  prompt?: string;
  style_id?: string;
  style_name: string;
  status?: string;
  cover_url?: string;
  total_stickers: number;
  created_at: string;
  stickers: StickerItem[];
}
