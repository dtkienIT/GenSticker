export type ExportResult =
  | { status: 'succeeded' }
  | { status: 'permission_denied' }
  | { status: 'unavailable' }
  | { status: 'failed'; code: 'SAVE_FAILED' | 'SHARE_FAILED' };

export interface PlatformAssetExporter {
  saveToPhotoLibrary(localUri: string): Promise<ExportResult>;
  share(localUri: string): Promise<ExportResult>;
}
