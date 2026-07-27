import { describe, expect, it, vi } from 'vitest';
import { WebPlatformAssetExporter } from './webPlatformAssetExporter';

describe('WebPlatformAssetExporter', () => {
  it('downloads a PNG with a temporary anchor', async () => {
    const anchor = { href: '', download: '', click: vi.fn(), remove: vi.fn() };
    const append = vi.fn();
    const exporter = new WebPlatformAssetExporter({
      createAnchor: () => anchor,
      appendAnchor: append,
      fetch: vi.fn(),
      canShare: vi.fn(),
      share: vi.fn(),
      now: () => 123,
    });

    await expect(exporter.saveToPhotoLibrary('blob:sticker')).resolves.toEqual({
      status: 'succeeded',
    });
    expect(anchor).toMatchObject({
      href: 'blob:sticker',
      download: 'gensticker-123.png',
    });
    expect(append).toHaveBeenCalledWith(anchor);
    expect(anchor.click).toHaveBeenCalledOnce();
    expect(anchor.remove).toHaveBeenCalledOnce();
  });

  it('shares a PNG only when file sharing is supported', async () => {
    const share = vi.fn(async () => undefined);
    const exporter = new WebPlatformAssetExporter({
      createAnchor: vi.fn(),
      appendAnchor: vi.fn(),
      fetch: vi.fn(async () => new Response(new Blob(['png'], { type: 'image/png' }))),
      canShare: vi.fn(() => true),
      share,
      now: () => 123,
    });

    await expect(exporter.share('blob:sticker')).resolves.toEqual({ status: 'succeeded' });
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ files: [expect.any(File)] }));
  });
});
