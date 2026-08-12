import { File, Paths } from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import * as Sharing from 'expo-sharing';

import { getStickerAssetUrl } from '@/api/client';
import { AppError } from '@/api/errors';
import { getAuthHeaders } from '@/auth/auth';

export async function shareSticker(stickerId: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new AppError('Thiết bị này chưa hỗ trợ bảng chia sẻ.', {
      code: 'SHARING_UNAVAILABLE',
    });
  }
  const destination = new File(Paths.cache, `duhat-share-${Crypto.randomUUID()}.svg`);
  try {
    if (destination.exists) destination.delete();
    const downloaded = await File.downloadFileAsync(getStickerAssetUrl(stickerId), destination, {
      headers: await getAuthHeaders(),
      idempotent: false,
    });
    await Sharing.shareAsync(downloaded.uri, {
      dialogTitle: 'Chia sẻ sticker',
      mimeType: 'image/svg+xml',
      UTI: 'public.svg-image',
    });
  } finally {
    // Android có thể để lại file một phần nếu download thất bại giữa chừng.
    if (destination.exists) destination.delete();
  }
}
