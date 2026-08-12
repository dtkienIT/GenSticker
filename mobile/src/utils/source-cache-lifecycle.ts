type DeleteFile = (uri: string) => void;

function normalizedFilePath(uri: string): string | null {
  if (!uri.startsWith('file://')) return null;
  try {
    const withoutQuery = decodeURIComponent(uri.slice('file://'.length).split(/[?#]/, 1)[0] ?? '');
    if (!withoutQuery.startsWith('/')) return null;

    const parts: string[] = [];
    for (const part of withoutQuery.split('/')) {
      if (!part || part === '.') continue;
      if (part === '..') parts.pop();
      else parts.push(part);
    }
    return `/${parts.join('/')}`;
  } catch {
    return null;
  }
}

/** Only app-cache descendants are safe to delete; the cache directory itself is not. */
export function isAppCacheFileUri(uri: string, cacheDirectoryUri: string): boolean {
  const candidate = normalizedFilePath(uri);
  const cacheRoot = normalizedFilePath(cacheDirectoryUri);
  if (!candidate || !cacheRoot || candidate === cacheRoot) return false;
  return candidate.startsWith(`${cacheRoot.replace(/\/$/, '')}/`);
}

/**
 * Tracks temporary picker copies and defers deletion while their bytes are in
 * flight. The class is platform-free so its race behavior can be unit tested.
 */
export class SourceCacheLifecycle {
  private readonly tracked = new Set<string>();
  private readonly pendingUploads = new Map<string, number>();
  private readonly cleanupRequested = new Set<string>();
  private currentUri: string | null = null;

  constructor(
    private readonly cacheDirectoryUri: string,
    private readonly deleteFile: DeleteFile,
  ) {}

  replace(uri: string): void {
    const previous = this.currentUri;
    this.currentUri = isAppCacheFileUri(uri, this.cacheDirectoryUri) ? uri : null;
    if (this.currentUri) this.tracked.add(this.currentUri);
    if (previous && previous !== this.currentUri) this.requestCleanup(previous);
  }

  beginUpload(uri: string): void {
    if (!this.tracked.has(uri)) return;
    this.pendingUploads.set(uri, (this.pendingUploads.get(uri) ?? 0) + 1);
  }

  finishUpload(uri: string, uploadedSuccessfully: boolean): void {
    if (!this.tracked.has(uri)) return;
    if (uploadedSuccessfully) this.cleanupRequested.add(uri);

    const remaining = Math.max(0, (this.pendingUploads.get(uri) ?? 1) - 1);
    if (remaining > 0) this.pendingUploads.set(uri, remaining);
    else this.pendingUploads.delete(uri);
    this.flush(uri);
  }

  cleanupAll(): void {
    for (const uri of [...this.tracked]) this.requestCleanup(uri);
    this.currentUri = null;
  }

  private requestCleanup(uri: string): void {
    if (!this.tracked.has(uri)) return;
    this.cleanupRequested.add(uri);
    this.flush(uri);
  }

  private flush(uri: string): void {
    if (!this.cleanupRequested.has(uri) || (this.pendingUploads.get(uri) ?? 0) > 0) return;
    try {
      this.deleteFile(uri);
    } catch {
      // Best effort: OS cache eviction remains the fallback if deletion fails.
    } finally {
      this.tracked.delete(uri);
      this.cleanupRequested.delete(uri);
      this.pendingUploads.delete(uri);
      if (this.currentUri === uri) this.currentUri = null;
    }
  }
}
