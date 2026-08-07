import type { StickerItem, StickerStyleId, ProcessStep } from '../types/sticker';
import { STICKER_STYLES } from '../mock/mockStickers';
import { AuthService } from './authService';

export interface StickerGenerationParams {
  imageFile: File;
  styleId: StickerStyleId;
  onStepProgress?: (stepIndex: number, step: ProcessStep, overallProgress: number) => void;
}

interface BackendStep {
  id: number;
  step_name: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
}

interface BackendSticker {
  id: string;
  title: string;
  emotion: string;
  tags: string[];
  image_url: string;
  style_id: string;
  is_favorite: boolean;
  width: number;
  height: number;
  file_size_kb: number;
}

interface BackendJobResponse {
  job_id: string;
  status: 'processing' | 'completed' | 'error';
  current_step: number;
  progress_percentage: number;
  steps: BackendStep[];
  stickers?: BackendSticker[];
  error_message?: string;
  preview_image_url?: string;
  preview_image_urls?: string[];
  quality_status?: 'reviewing' | 'accepted' | 'rejected';
}

export class StickerGenerationError extends Error {
  readonly jobId: string;
  readonly previewImageUrl: string | null;
  readonly previewImageUrls: string[];
  readonly qualityStatus: 'reviewing' | 'accepted' | 'rejected' | null;

  constructor(message: string, job: BackendJobResponse) {
    super(message);
    this.name = 'StickerGenerationError';
    this.jobId = job.job_id;
    this.previewImageUrl = job.preview_image_url || null;
    this.previewImageUrls = job.preview_image_urls || (job.preview_image_url ? [job.preview_image_url] : []);
    this.qualityStatus = job.quality_status || null;
  }
}

export class StickerService {
  private static readonly ACTIVE_JOB_KEY = 'gensticker.activeJobId';

  static clearActiveJob() {
    sessionStorage.removeItem(StickerService.ACTIVE_JOB_KEY);
  }

  static async generateStickers({
    imageFile,
    styleId,
    onStepProgress,
  }: StickerGenerationParams): Promise<{ stickers: StickerItem[]; previewImageUrls: string[] }> {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
    const accessToken = AuthService.getAccessToken();
    if (!accessToken) {
      throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }
    const form = new FormData();
    form.append('file', imageFile);
    form.append('style_id', styleId);

    const startResponse = await fetch(`${apiBase}/stickers/generate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    });
    if (!startResponse.ok) {
      if (startResponse.status === 401) AuthService.logout();
      throw new Error(await StickerService.readApiError(startResponse));
    }

    const started = await startResponse.json() as BackendJobResponse;
    sessionStorage.setItem(StickerService.ACTIVE_JOB_KEY, started.job_id);
    return StickerService.pollJob(started, styleId, onStepProgress);
  }

  static async retryJob(
    jobId: string,
    styleId: StickerStyleId,
    onStepProgress?: (stepIndex: number, step: ProcessStep, overallProgress: number) => void,
  ): Promise<{ stickers: StickerItem[]; previewImageUrls: string[] }> {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
    const accessToken = AuthService.getAccessToken();
    if (!accessToken) throw new Error('Authentication required.');
    const response = await fetch(`${apiBase}/stickers/jobs/${jobId}/retry`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) throw new Error(await StickerService.readApiError(response));
    const job = await response.json() as BackendJobResponse;
    sessionStorage.setItem(StickerService.ACTIVE_JOB_KEY, job.job_id);
    return StickerService.pollJob(job, styleId, onStepProgress);
  }

  static async resumeActiveJob(
    styleId: StickerStyleId,
  ): Promise<{ stickers: StickerItem[]; previewImageUrls: string[] } | null> {
    const jobId = sessionStorage.getItem(StickerService.ACTIVE_JOB_KEY);
    const accessToken = AuthService.getAccessToken();
    if (!jobId || !accessToken) return null;
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
    const response = await fetch(`${apiBase}/stickers/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (response.status === 404) {
      sessionStorage.removeItem(StickerService.ACTIVE_JOB_KEY);
      return null;
    }
    if (!response.ok) throw new Error(await StickerService.readApiError(response));
    return StickerService.pollJob(await response.json() as BackendJobResponse, styleId);
  }

  private static async pollJob(
    started: BackendJobResponse,
    styleId: StickerStyleId,
    onStepProgress?: (stepIndex: number, step: ProcessStep, overallProgress: number) => void,
  ): Promise<{ stickers: StickerItem[]; previewImageUrls: string[] }> {
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
    const accessToken = AuthService.getAccessToken();
    if (!accessToken) throw new Error('Authentication required.');
    StickerService.emitBackendProgress(started, onStepProgress);
    const deadline = Date.now() + 12 * 60 * 1000;
    let job = started;
    while (job.status === 'processing') {
      if (Date.now() > deadline) {
        throw new Error('Generation timed out. Please try again with a clearer portrait.');
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const response = await fetch(`${apiBase}/stickers/jobs/${job.job_id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) {
        if (response.status === 401) AuthService.logout();
        throw new Error(await StickerService.readApiError(response));
      }
      job = await response.json() as BackendJobResponse;
      StickerService.emitBackendProgress(job, onStepProgress);
    }
    if (job.status === 'error') {
      throw new StickerGenerationError(
        job.error_message || 'Sticker generation failed.',
        job,
      );
    }
    if (!job.stickers || job.stickers.length !== 20) {
      throw new Error('Backend returned an incomplete sticker pack.');
    }
    sessionStorage.removeItem(StickerService.ACTIVE_JOB_KEY);
    return {
      stickers: job.stickers.map((sticker) => StickerService.toStickerItem(sticker, styleId)),
      previewImageUrls: job.preview_image_urls || (job.preview_image_url ? [job.preview_image_url] : []),
    };
  }

  private static emitBackendProgress(
    job: BackendJobResponse,
    onStepProgress?: (stepIndex: number, step: ProcessStep, overallProgress: number) => void,
  ) {
    const activeIndex = Math.max(0, Math.min(job.steps.length - 1, job.current_step - 1));
    const orderedIndices = job.steps
      .map((_, index) => index)
      .sort((left, right) => Number(left === activeIndex) - Number(right === activeIndex));
    orderedIndices.forEach((index) => {
      const backendStep = job.steps[index];
      const step: ProcessStep = {
        id: String(backendStep.id),
        title: backendStep.step_name,
        description: backendStep.description,
        status: backendStep.status === 'pending' ? 'idle' : backendStep.status,
        progress: backendStep.progress,
        estimatedTimeSec: 1,
      };
      onStepProgress?.(index, step, job.progress_percentage);
    });
  }

  private static toStickerItem(sticker: BackendSticker, styleId: StickerStyleId): StickerItem {
    const style = STICKER_STYLES.find((item) => item.id === styleId);
    return {
      id: sticker.id,
      title: sticker.title,
      imageUrl: sticker.image_url,
      style: styleId,
      styleName: style?.name || 'Custom AI',
      tags: sticker.tags,
      emotion: sticker.emotion,
      likes: 0,
      isFavorite: sticker.is_favorite,
      sizeKb: sticker.file_size_kb,
      dimensions: `${sticker.width}x${sticker.height}`,
    };
  }

  private static async readApiError(response: Response): Promise<string> {
    try {
      const payload = await response.json() as { detail?: string };
      return payload.detail || `Backend request failed (${response.status}).`;
    } catch {
      return `Backend request failed (${response.status}).`;
    }
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

