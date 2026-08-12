import { describe, expect, it, vi } from 'vitest';

import {
  isAppCacheFileUri,
  SourceCacheLifecycle,
} from '../src/utils/source-cache-lifecycle';

const CACHE_URI = 'file:///data/user/0/com.duhat.gensticker/cache/';

describe('source image cache boundary', () => {
  it('accepts only files below the app cache directory', () => {
    expect(isAppCacheFileUri(`${CACHE_URI}ImagePicker/crop.jpg`, CACHE_URI)).toBe(true);
    expect(isAppCacheFileUri(CACHE_URI, CACHE_URI)).toBe(false);
    expect(isAppCacheFileUri('file:///data/user/0/com.duhat.gensticker/files/photo.jpg', CACHE_URI)).toBe(false);
    expect(isAppCacheFileUri(`${CACHE_URI}../files/photo.jpg`, CACHE_URI)).toBe(false);
    expect(isAppCacheFileUri('content://media/external/images/1', CACHE_URI)).toBe(false);
  });

  it('normalizes encoded paths before checking the boundary', () => {
    expect(isAppCacheFileUri(`${CACHE_URI}ImagePicker%2Fcrop.jpg`, CACHE_URI)).toBe(true);
    expect(isAppCacheFileUri(`${CACHE_URI}%2E%2E%2Ffiles%2Fphoto.jpg`, CACHE_URI)).toBe(false);
  });
});

describe('source image cache lifecycle', () => {
  it('deletes the previous picker copy when the user replaces it', () => {
    const deleteFile = vi.fn();
    const files = new SourceCacheLifecycle(CACHE_URI, deleteFile);
    const first = `${CACHE_URI}ImagePicker/first.jpg`;
    const second = `${CACHE_URI}ImagePicker/second.jpg`;

    files.replace(first);
    files.replace(second);

    expect(deleteFile).toHaveBeenCalledOnce();
    expect(deleteFile).toHaveBeenCalledWith(first);
  });

  it('defers cleanup until every upload using the file has finished', () => {
    const deleteFile = vi.fn();
    const files = new SourceCacheLifecycle(CACHE_URI, deleteFile);
    const source = `${CACHE_URI}ImagePicker/source.jpg`;

    files.replace(source);
    files.beginUpload(source);
    files.beginUpload(source);
    files.cleanupAll();
    expect(deleteFile).not.toHaveBeenCalled();

    files.finishUpload(source, false);
    expect(deleteFile).not.toHaveBeenCalled();

    files.finishUpload(source, false);
    expect(deleteFile).toHaveBeenCalledOnce();
    expect(deleteFile).toHaveBeenCalledWith(source);
  });

  it('deletes a picker copy after a successful upload but retains it after a failed upload', () => {
    const deleteFile = vi.fn();
    const files = new SourceCacheLifecycle(CACHE_URI, deleteFile);
    const failed = `${CACHE_URI}ImagePicker/failed.jpg`;
    const uploaded = `${CACHE_URI}ImagePicker/uploaded.jpg`;

    files.replace(failed);
    files.beginUpload(failed);
    files.finishUpload(failed, false);
    expect(deleteFile).not.toHaveBeenCalled();

    files.replace(uploaded);
    expect(deleteFile).toHaveBeenCalledWith(failed);

    files.beginUpload(uploaded);
    files.finishUpload(uploaded, true);
    expect(deleteFile).toHaveBeenCalledWith(uploaded);
    expect(deleteFile).toHaveBeenCalledTimes(2);
  });

  it('never deletes untracked URIs outside the app cache', () => {
    const deleteFile = vi.fn();
    const files = new SourceCacheLifecycle(CACHE_URI, deleteFile);

    files.replace('file:///private/user-photo.jpg');
    files.beginUpload('file:///private/user-photo.jpg');
    files.finishUpload('file:///private/user-photo.jpg', true);
    files.cleanupAll();

    expect(deleteFile).not.toHaveBeenCalled();
  });
});
