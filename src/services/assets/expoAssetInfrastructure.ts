import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import type { GalleryMetadataStorage, GallerySticker, StickerFileStore } from './types';

const GALLERY_STORAGE_KEY = '@gensticker/gallery/v2';

export const stickerAssetDirectory = new Directory(Paths.document, 'gensticker-stickers');

export class ExpoStickerFileStore implements StickerFileStore {
  async copy(sourceUri: string, destinationUri: string): Promise<void> {
    stickerAssetDirectory.create({ idempotent: true, intermediates: true });
    const source = new File(sourceUri);
    const destination = new File(destinationUri);
    if (destination.exists) destination.delete();
    source.copy(destination);
  }

  async exists(uri: string): Promise<boolean> {
    return new File(uri).exists;
  }

  async delete(uri: string): Promise<void> {
    const file = new File(uri);
    if (file.exists) file.delete();
  }
}

export class AsyncStorageGalleryMetadata implements GalleryMetadataStorage {
  async load(): Promise<GallerySticker[]> {
    const serialized = await AsyncStorage.getItem(GALLERY_STORAGE_KEY);
    if (!serialized) return [];
    const parsed: unknown = JSON.parse(serialized);
    return Array.isArray(parsed) ? (parsed as GallerySticker[]) : [];
  }

  async save(items: GallerySticker[]): Promise<void> {
    await AsyncStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(items));
  }
}
