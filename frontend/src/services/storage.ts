import { StickerPack } from '../types';

const DB_NAME = 'duhat_stickers';
const STORE_NAME = 'images';
const DB_VERSION = 1;
const PACKS_KEY = 'duhat_sticker_packs';

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

export const savePack = async (pack: StickerPack): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);

  const metaPack: StickerPack = { ...pack, stickers: [] };

  for (const sticker of pack.stickers) {
    if (sticker.selected) {
      store.put(sticker.imageBase64, sticker.id);
      metaPack.stickers.push({ ...sticker, imageBase64: '' });
    }
  }

  const existing = getPacks();
  localStorage.setItem(PACKS_KEY, JSON.stringify([metaPack, ...existing]));
  
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getPacks = (): StickerPack[] => {
  const stored = localStorage.getItem(PACKS_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const deletePack = async (packId: string): Promise<void> => {
  const packs = getPacks();
  const pack = packs.find(p => p.id === packId);
  if (!pack) return;
  
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  
  pack.stickers.forEach(s => store.delete(s.id));
  
  const newPacks = packs.filter(p => p.id !== packId);
  localStorage.setItem(PACKS_KEY, JSON.stringify(newPacks));
};

export const deleteSticker = async (packId: string, stickerId: string): Promise<void> => {
  const packs = getPacks();
  const packIndex = packs.findIndex(p => p.id === packId);
  if (packIndex === -1) return;
  
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  store.delete(stickerId);
  
  packs[packIndex].stickers = packs[packIndex].stickers.filter(s => s.id !== stickerId);
  if (packs[packIndex].stickers.length === 0) {
    packs.splice(packIndex, 1);
  }
  
  localStorage.setItem(PACKS_KEY, JSON.stringify(packs));
};

export const getImageBlob = async (stickerId: string): Promise<string> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(stickerId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};
