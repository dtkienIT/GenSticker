import { Share } from 'react-native';
import * as Sharing from 'expo-sharing';
import type { ExportAsset, ExportManifest } from '@/services/contracts';

function preferredAsset(manifest: ExportManifest): ExportAsset | undefined {
  return manifest.assets.find((asset) => asset.format === 'zip') ?? manifest.assets[0];
}

export async function shareExportManifest(manifest: ExportManifest): Promise<void> {
  const asset = preferredAsset(manifest);

  if (!asset) {
    throw new Error('Export manifest does not contain a shareable asset.');
  }

  const nativeFileShareAvailable =
    manifest.nativeShareAvailable &&
    asset.contentUri.startsWith('file:') &&
    (await Sharing.isAvailableAsync());

  if (nativeFileShareAvailable) {
    await Sharing.shareAsync(asset.contentUri, {
      dialogTitle: `Chia sẻ ${asset.fileName}`,
      mimeType:
        asset.format === 'png'
          ? 'image/png'
          : asset.format === 'webp'
            ? 'image/webp'
            : 'application/zip',
      UTI: asset.format === 'zip' ? 'public.zip-archive' : 'public.image',
    });
    return;
  }

  await Share.share({
    message: `GenSticker: ${asset.fileName}\n${asset.contentUri}`,
    url: asset.contentUri,
    title: `Chia sẻ ${asset.fileName}`,
  });
}
