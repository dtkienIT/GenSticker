import type { ImagePickerAsset } from 'expo-image-picker';

import { API_BASE_URL } from '@/config/env';

import {
  generationJobSchema,
  packsSchema,
  stickerPackSchema,
  stickerSetSchema,
  validatedSourceSchema,
} from './contracts';
import { requestEmpty, requestJson } from './http';
import { inferUploadImage } from './image-upload';

export async function validateSource(
  asset: ImagePickerAsset,
  consentVersion: string,
) {
  const upload = inferUploadImage(asset);
  const form = new FormData();
  form.append('consent_accepted', 'true');
  form.append('consent_version', consentVersion);
  form.append(
    'file',
    {
      uri: asset.uri,
      name: upload.fileName,
      type: upload.mimeType,
    } as unknown as Blob,
  );
  return requestJson('/source-images', validatedSourceSchema, { method: 'POST', body: form });
}

export type StickerStyle = 'chibi_2d' | 'chibi_3d' | 'plush' | 'pixel';

export function createJob(
  sourceImageId: string,
  idempotencyKey: string,
  options: { styleId?: StickerStyle; locale?: 'vi' | 'en' } = {},
) {
  return requestJson('/generation-jobs', generationJobSchema, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({
      source_image_id: sourceImageId,
      style_id: options.styleId ?? 'chibi_3d',
      locale: options.locale ?? 'vi',
      catalog_version: 'v1',
    }),
  });
}

export function getJob(jobId: string) {
  return requestJson(`/generation-jobs/${encodeURIComponent(jobId)}`, generationJobSchema);
}

export function regenerateJob(jobId: string, idempotencyKey: string) {
  return requestJson(`/generation-jobs/${encodeURIComponent(jobId)}/regenerate`, generationJobSchema, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({}),
  });
}

export function getStickerSet(setId: string) {
  return requestJson(`/sticker-sets/${encodeURIComponent(setId)}`, stickerSetSchema);
}

export function saveStickerSet(setId: string, stickerIds: string[], idempotencyKey: string) {
  return requestJson(`/sticker-sets/${encodeURIComponent(setId)}/save`, stickerPackSchema, {
    method: 'POST',
    headers: { 'Idempotency-Key': idempotencyKey },
    body: JSON.stringify({ sticker_ids: stickerIds }),
  });
}

export function getPacks() {
  return requestJson('/saved-packs', packsSchema);
}

export function getPack(packId: string) {
  return requestJson(`/saved-packs/${encodeURIComponent(packId)}`, stickerPackSchema);
}

export function deletePack(packId: string) {
  return requestEmpty(`/saved-packs/${encodeURIComponent(packId)}`, { method: 'DELETE' });
}

export function getStickerAssetUrl(stickerId: string): string {
  return `${API_BASE_URL}/stickers/${encodeURIComponent(stickerId)}/asset`;
}
