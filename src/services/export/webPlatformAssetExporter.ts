import type { ExportResult, PlatformAssetExporter } from './types';

interface AnchorLike {
  href: string;
  download: string;
  click(): void;
  remove(): void;
}

interface WebExporterDependencies {
  createAnchor?: () => AnchorLike;
  appendAnchor?: (anchor: AnchorLike) => void;
  fetch?: typeof fetch;
  canShare?: (data: ShareData) => boolean;
  share?: (data: ShareData) => Promise<void>;
  now?: () => number;
}

export class WebPlatformAssetExporter implements PlatformAssetExporter {
  constructor(private readonly dependencies: WebExporterDependencies = {}) {}

  async saveToPhotoLibrary(localUri: string): Promise<ExportResult> {
    try {
      const anchor =
        this.dependencies.createAnchor?.() ?? (document.createElement('a') as AnchorLike);
      anchor.href = localUri;
      anchor.download = `gensticker-${this.dependencies.now?.() ?? Date.now()}.png`;
      (
        this.dependencies.appendAnchor ??
        ((item) => document.body.appendChild(item as unknown as Node))
      )(anchor);
      anchor.click();
      anchor.remove();
      return { status: 'succeeded' };
    } catch {
      return { status: 'failed', code: 'SAVE_FAILED' };
    }
  }

  async share(localUri: string): Promise<ExportResult> {
    try {
      const response = await (this.dependencies.fetch ?? fetch)(localUri);
      if (!response.ok) return { status: 'failed', code: 'SHARE_FAILED' };
      const blob = await response.blob();
      const file = new File([blob], 'gensticker.png', { type: 'image/png' });
      const data: ShareData = { files: [file], title: 'GenSticker' };
      const canShare =
        this.dependencies.canShare ?? ((value: ShareData) => navigator.canShare?.(value) ?? false);
      if (!canShare(data)) return { status: 'unavailable' };
      await (this.dependencies.share ?? ((value) => navigator.share(value)))(data);
      return { status: 'succeeded' };
    } catch {
      return { status: 'failed', code: 'SHARE_FAILED' };
    }
  }
}
