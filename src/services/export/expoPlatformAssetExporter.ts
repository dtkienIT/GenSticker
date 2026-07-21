import type { MockScenario } from '../generation/types';
import type { ExportResult, PlatformAssetExporter } from './types';

interface ExpoExporterDependencies {
  requestPhotoPermission: () => Promise<{ granted: boolean }>;
  createMediaAsset: (localUri: string) => Promise<unknown>;
  isSharingAvailable: () => Promise<boolean>;
  shareFile: (localUri: string, mimeType: string) => Promise<void>;
  getScenario?: () => MockScenario;
}

export class ExpoPlatformAssetExporter implements PlatformAssetExporter {
  constructor(private readonly dependencies: ExpoExporterDependencies) {}

  async saveToPhotoLibrary(localUri: string): Promise<ExportResult> {
    try {
      const permission = await this.dependencies.requestPhotoPermission();
      if (!permission.granted) return { status: 'permission_denied' };
      if (this.dependencies.getScenario?.() === 'save_failure') {
        return { status: 'failed', code: 'SAVE_FAILED' };
      }
      await this.dependencies.createMediaAsset(localUri);
      return { status: 'succeeded' };
    } catch {
      return { status: 'failed', code: 'SAVE_FAILED' };
    }
  }

  async share(localUri: string): Promise<ExportResult> {
    try {
      if (!(await this.dependencies.isSharingAvailable())) {
        return { status: 'unavailable' };
      }
      if (this.dependencies.getScenario?.() === 'share_failure') {
        return { status: 'failed', code: 'SHARE_FAILED' };
      }
      await this.dependencies.shareFile(localUri, 'image/png');
      return { status: 'succeeded' };
    } catch {
      return { status: 'failed', code: 'SHARE_FAILED' };
    }
  }
}
