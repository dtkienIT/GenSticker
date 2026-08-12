import type { ImagePickerAsset } from 'expo-image-picker';

import { AppError } from './errors';

const mimeAliases: Record<string, SupportedImageMime> = {
  'image/jpeg': 'image/jpeg',
  'image/jpg': 'image/jpeg',
  'image/png': 'image/png',
  'image/webp': 'image/webp',
  'image/heic': 'image/heic',
  'image/heif': 'image/heif',
};

const extensionMimes: Record<string, SupportedImageMime> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
};

const mimeExtensions: Record<SupportedImageMime, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

export type SupportedImageMime =
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp'
  | 'image/heic'
  | 'image/heif';

export type UploadImageInfo = {
  mimeType: SupportedImageMime;
  fileName: string;
};

function extensionOf(value?: string | null): string | undefined {
  if (!value) return undefined;
  const path = value.split(/[?#]/, 1)[0];
  const match = path?.match(/\.([a-zA-Z0-9]+)$/);
  return match?.[1]?.toLowerCase();
}

export function inferUploadImage(asset: Pick<ImagePickerAsset, 'fileName' | 'mimeType' | 'uri'>): UploadImageInfo {
  const reportedMime = asset.mimeType?.trim().toLowerCase();
  let mimeType = reportedMime ? mimeAliases[reportedMime] : undefined;

  if (!mimeType) {
    const extension = extensionOf(asset.fileName) ?? extensionOf(asset.uri);
    mimeType = extension ? extensionMimes[extension] : undefined;
  }
  if (!mimeType) {
    throw new AppError(
      'Không xác định được định dạng ảnh. Hãy chọn ảnh JPG, PNG, WebP, HEIC hoặc HEIF.',
      { code: 'UNSUPPORTED_IMAGE_TYPE' },
    );
  }

  // Không gửi tên file gốc của người dùng; chỉ dùng nó để suy luận MIME cục bộ.
  return { mimeType, fileName: `source-image.${mimeExtensions[mimeType]}` };
}
