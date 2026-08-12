import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

type AuthStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

const STORAGE_PREFIX = 'duhat.supabase.';
const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  keychainService: 'vn.duhat.gensticker.supabase-auth',
};
const resolvedKeys = new Map<string, Promise<string>>();

/**
 * Supabase derives its storage key from the project URL. Hashing gives every
 * project a stable, collision-resistant key containing only characters allowed
 * by Expo SecureStore, without putting project/session details in the key name.
 */
function secureKeyFor(key: string): Promise<string> {
  const cached = resolvedKeys.get(key);
  if (cached) return cached;

  const pending = Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, key).then(
    (digest) => `${STORAGE_PREFIX}${digest}`,
  );
  resolvedKeys.set(key, pending);
  return pending;
}

export const secureStoreAuthStorage: AuthStorage = {
  async getItem(key) {
    return SecureStore.getItemAsync(await secureKeyFor(key), SECURE_STORE_OPTIONS);
  },
  async setItem(key, value) {
    await SecureStore.setItemAsync(await secureKeyFor(key), value, SECURE_STORE_OPTIONS);
  },
  async removeItem(key) {
    await SecureStore.deleteItemAsync(await secureKeyFor(key), SECURE_STORE_OPTIONS);
  },
};
