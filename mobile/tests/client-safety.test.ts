import { describe, expect, it, vi } from 'vitest';

import { AppError, problemToAppError } from '../src/api/errors';
import { inferUploadImage } from '../src/api/image-upload';
import { resolveIntentKey } from '../src/utils/idempotency';

describe('image upload MIME inference', () => {
  it('prefers a supported reported MIME and sends a privacy-safe filename', () => {
    expect(
      inferUploadImage({
        fileName: 'anh-rieng-tu.png',
        mimeType: 'image/png',
        uri: 'file:///photo.jpg',
      }),
    ).toEqual({ mimeType: 'image/png', fileName: 'source-image.png' });
  });

  it('falls back to the filename or URI extension when MIME is unavailable', () => {
    expect(inferUploadImage({ fileName: null, uri: 'file:///photo.HEIC?x=1' })).toEqual(
      { mimeType: 'image/heic', fileName: 'source-image.heic' },
    );
    expect(
      inferUploadImage({ fileName: 'picked.webp', mimeType: 'application/octet-stream', uri: 'file:///asset' }),
    ).toEqual({ mimeType: 'image/webp', fileName: 'source-image.webp' });
  });

  it('rejects an unknown type before upload rather than guessing JPEG', () => {
    expect(() =>
      inferUploadImage({ fileName: 'payload.bin', uri: 'file:///payload' }),
    ).toThrowError(AppError);
  });
});

describe('idempotency intent', () => {
  it('reuses a key for the same intent and rotates it when the intent changes', () => {
    const createKey = vi.fn().mockReturnValueOnce('key-a').mockReturnValueOnce('key-b');
    const first = resolveIntentKey(null, 'save:set:1,2', createKey);
    const networkRetry = resolveIntentKey(first, 'save:set:1,2', createKey);
    const changedSelection = resolveIntentKey(networkRetry, 'save:set:1,3', createKey);

    expect(networkRetry.key).toBe('key-a');
    expect(changedSelection.key).toBe('key-b');
    expect(createKey).toHaveBeenCalledTimes(2);
  });
});

describe('safe problem details', () => {
  it('uses the backend retryable flag without exposing backend detail', () => {
    const error = problemToAppError(400, {
      code: 'SOURCE_NOT_READY',
      detail: 'sensitive internal detail',
      retryable: true,
    });
    expect(error).toMatchObject({ code: 'SOURCE_NOT_READY', retryable: true, status: 400 });
    expect(error.message).not.toContain('sensitive');
  });

  it('treats explicit retryable=false as authoritative even on 500', () => {
    expect(problemToAppError(500, { code: 'SAVE_FAILED', retryable: false }).retryable).toBe(false);
  });
});
