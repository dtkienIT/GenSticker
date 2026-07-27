import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { GallerySticker } from '../assets/types';
import type { LocalDiagnosticEvent } from '../diagnostics/types';

export const WEB_DATABASE_NAME = 'gensticker-web-v1';

export type StoredSticker = Omit<GallerySticker, 'localUri'> & { png: Blob };

interface GenStickerDatabase extends DBSchema {
  stickers: {
    key: string;
    value: StoredSticker;
    indexes: { requestId: string };
  };
  diagnostics: {
    key: string;
    value: LocalDiagnosticEvent;
  };
  meta: {
    key: string;
    value: unknown;
  };
}

export function openWebDatabase(
  databaseName = WEB_DATABASE_NAME,
): Promise<IDBPDatabase<GenStickerDatabase>> {
  return openDB<GenStickerDatabase>(databaseName, 1, {
    upgrade(database) {
      const stickers = database.createObjectStore('stickers', { keyPath: 'assetId' });
      stickers.createIndex('requestId', 'requestId', { unique: true });
      database.createObjectStore('diagnostics', { keyPath: 'id' });
      database.createObjectStore('meta');
    },
  });
}
