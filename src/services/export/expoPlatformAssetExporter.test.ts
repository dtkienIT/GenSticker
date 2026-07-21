import { describe, expect, it } from 'vitest';
import { ExpoPlatformAssetExporter } from './expoPlatformAssetExporter';

describe('ExpoPlatformAssetExporter', () => {
  it('requests write-only photo permission and saves the local PNG', async () => {
    const calls: string[] = [];
    const exporter = new ExpoPlatformAssetExporter({
      requestPhotoPermission: async () => {
        calls.push('permission');
        return { granted: true };
      },
      createMediaAsset: async (uri) => calls.push(uri),
      isSharingAvailable: async () => true,
      shareFile: async () => undefined,
    });

    await expect(exporter.saveToPhotoLibrary('file:///stickers/one.png')).resolves.toEqual({
      status: 'succeeded',
    });
    expect(calls).toEqual(['permission', 'file:///stickers/one.png']);
  });

  it('returns permission denied without attempting a save', async () => {
    let saved = false;
    const exporter = new ExpoPlatformAssetExporter({
      requestPhotoPermission: async () => ({ granted: false }),
      createMediaAsset: async () => {
        saved = true;
      },
      isSharingAvailable: async () => true,
      shareFile: async () => undefined,
    });

    await expect(exporter.saveToPhotoLibrary('file:///stickers/one.png')).resolves.toEqual({
      status: 'permission_denied',
    });
    expect(saved).toBe(false);
  });

  it('shares the PNG as an image file', async () => {
    const calls: Array<{ uri: string; mimeType: string }> = [];
    const exporter = new ExpoPlatformAssetExporter({
      requestPhotoPermission: async () => ({ granted: true }),
      createMediaAsset: async () => undefined,
      isSharingAvailable: async () => true,
      shareFile: async (uri, mimeType) => {
        calls.push({ uri, mimeType });
      },
    });

    await expect(exporter.share('file:///stickers/one.png')).resolves.toEqual({
      status: 'succeeded',
    });
    expect(calls).toEqual([{ uri: 'file:///stickers/one.png', mimeType: 'image/png' }]);
  });

  it('reports unavailable sharing without invoking the share sheet', async () => {
    let shared = false;
    const exporter = new ExpoPlatformAssetExporter({
      requestPhotoPermission: async () => ({ granted: true }),
      createMediaAsset: async () => undefined,
      isSharingAvailable: async () => false,
      shareFile: async () => {
        shared = true;
      },
    });

    await expect(exporter.share('file:///stickers/one.png')).resolves.toEqual({
      status: 'unavailable',
    });
    expect(shared).toBe(false);
  });
});
