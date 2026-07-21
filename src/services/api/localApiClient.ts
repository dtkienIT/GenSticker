import {
  GeneratedSticker,
  GenerationProgress,
  StickerGenerationRequest,
} from '../../types/sticker';
import { StickerGenerationService } from '../mock/mockStickerService';
import { resolveBaseUrl } from './resolveBaseUrl';

export interface UploadSelfieResponse {
  asset?: {
    id: string;
    relative_path: string;
    mime_type: string;
  };
  validation: {
    valid: boolean;
    reason_codes: string[];
    warnings: string[];
  };
}

export interface GenerationJobResponse {
  id: string;
  user_id: string;
  character_id?: string;
  kind: string;
  status: string;
  current_stage: string;
  progress: number;
  result?: {
    candidates?: Array<{ asset_id?: string; id?: string }>;
  };
  error_code?: string;
  error_message?: string;
  completed_at?: string;
}

export class LocalApiStickerGenerationService implements StickerGenerationService {
  private get baseUrl(): string {
    return resolveBaseUrl();
  }

  private get devUserId(): string {
    return process.env.EXPO_PUBLIC_DEV_USER_ID || 'local-dev-user';
  }

  private get headers(): Record<string, string> {
    return {
      'X-Dev-User-Id': this.devUserId,
    };
  }

  async generateSticker(
    request: StickerGenerationRequest,
    onProgress?: (progress: GenerationProgress) => void,
  ): Promise<GeneratedSticker> {
    if (onProgress) {
      onProgress({ step: 'Preparing selfie upload...', progressPercent: 10 });
    }

    let sourceAssetId: string | undefined = undefined;

    // If selfie mode, upload selfie image via multipart/form-data
    if (request.mode === 'selfie' && request.sourceImageUri) {
      const uploadRes = await this.uploadSelfie(request.sourceImageUri);
      if (!uploadRes.validation.valid) {
        const reason = uploadRes.validation.reason_codes.join(', ');
        throw new Error(`Selfie validation failed: ${this.mapReasonCodeToMessage(reason)}`);
      }
      sourceAssetId = uploadRes.asset?.id;
    }

    if (onProgress) {
      onProgress({ step: 'Creating Character profile...', progressPercent: 25 });
    }

    // Create Character on backend
    const charRes = await fetch(`${this.baseUrl}/characters`, {
      method: 'POST',
      headers: {
        ...this.headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        display_name: request.prompt || `${request.style} ${request.emotion} Sticker`,
        selfie_asset_id: sourceAssetId,
      }),
    });

    if (!charRes.ok) {
      throw new Error(`Failed to create character (HTTP ${charRes.status})`);
    }
    const character = (await charRes.json()) as { id: string };

    if (onProgress) {
      onProgress({ step: 'Queueing AI generation job...', progressPercent: 40 });
    }

    // Submit generation job
    const jobRes = await fetch(`${this.baseUrl}/generation-jobs`, {
      method: 'POST',
      headers: {
        ...this.headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        character_id: character.id,
        kind: 'canonical_generation',
        seed: Math.floor(Math.random() * 1000000),
        style: request.style,
        emotion: request.emotion,
        prompt: request.prompt,
        source_asset_id: sourceAssetId,
      }),
    });

    if (!jobRes.ok) {
      throw new Error(`Failed to create generation job (HTTP ${jobRes.status})`);
    }
    const job = (await jobRes.json()) as GenerationJobResponse;

    // Poll durable job status until completed or failed
    const finalJob = await this.pollJob(job.id, onProgress);

    if (finalJob.status === 'failed') {
      throw new Error(finalJob.error_message || 'Backend generation job failed.');
    }

    const candidates = finalJob.result?.candidates || [];
    const firstCandidate = candidates[0];

    // Build content image URI pointing to authenticated content route or candidate asset
    const candidateAssetId = firstCandidate?.asset_id || firstCandidate?.id;
    const imageUrl = candidateAssetId
      ? `${this.baseUrl}/assets/${candidateAssetId}/content`
      : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="300" height="300" fill="%236366F1"/><text x="150" y="150" fill="%23FFFFFF" text-anchor="middle">API Sticker</text></svg>';

    return {
      id: finalJob.id,
      imageUri: imageUrl,
      mode: request.mode,
      prompt: request.prompt,
      sourceImageUri: request.sourceImageUri,
      style: request.style,
      emotion: request.emotion,
      stickerText: request.stickerText,
      createdAt: finalJob.completed_at || new Date().toISOString(),
    };
  }

  private async uploadSelfie(uri: string): Promise<UploadSelfieResponse> {
    const formData = new FormData();
    const filename = uri.split('/').pop() || 'selfie.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('file', {
      uri,
      name: filename,
      type,
    } as unknown as Blob);

    const res = await fetch(`${this.baseUrl}/assets/selfies`, {
      method: 'POST',
      headers: {
        ...this.headers,
      },
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`Selfie upload error (HTTP ${res.status})`);
    }
    return (await res.json()) as UploadSelfieResponse;
  }

  private async pollJob(
    jobId: string,
    onProgress?: (progress: GenerationProgress) => void,
  ): Promise<GenerationJobResponse> {
    const maxPolls = 60;
    for (let i = 0; i < maxPolls; i++) {
      await new Promise((resolve) => setTimeout(resolve, 600));

      const res = await fetch(`${this.baseUrl}/generation-jobs/${jobId}`, {
        headers: this.headers,
      });

      if (res.ok) {
        const job = (await res.json()) as GenerationJobResponse;
        if (onProgress) {
          onProgress({
            step: `[Backend Stage: ${job.current_stage}] Processing...`,
            progressPercent: Math.max(40, job.progress || 50),
          });
        }

        if (job.status === 'succeeded' || job.status === 'failed' || job.status === 'cancelled') {
          return job;
        }
      }
    }
    throw new Error('Timed out waiting for backend generation job to complete.');
  }

  private mapReasonCodeToMessage(reasonCode: string): string {
    const map: Record<string, string> = {
      unsupported_type: 'Unsupported image format. Please use JPEG, PNG, or WebP.',
      file_too_large: 'Image size exceeds maximum limit of 10MB.',
      invalid_image: 'Corrupt or unreadable image file.',
      resolution_too_low: 'Image resolution is too small (Minimum 256x256 required).',
      resolution_too_high: 'Image resolution exceeds maximum limit.',
      invalid_aspect_ratio: 'Image aspect ratio is too distorted.',
      blank_image: 'Uploaded photo appears blank or empty.',
    };
    return map[reasonCode] || reasonCode;
  }
}

export const localApiStickerService = new LocalApiStickerGenerationService();
