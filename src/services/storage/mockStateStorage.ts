import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProductServiceError } from '../contracts';

export interface MockStateStorage<T> {
  load(): Promise<T | null>;
  save(value: T): Promise<void>;
  clear(): Promise<void>;
}

const DEFAULT_STORAGE_KEY = '@gensticker/mock-product-state/v1';

function assertNoImageBinary(serialized: string): void {
  if (/data:image\/[^;]+;base64,/i.test(serialized)) {
    throw new ProductServiceError(
      'storage_write_failed',
      'Image binary must never be persisted in frontend mock state.',
    );
  }
}

export class AsyncStorageMockStateStorage<T> implements MockStateStorage<T> {
  constructor(private readonly key = DEFAULT_STORAGE_KEY) {}

  async load(): Promise<T | null> {
    try {
      const serialized = await AsyncStorage.getItem(this.key);
      return serialized ? (JSON.parse(serialized) as T) : null;
    } catch (error) {
      throw new ProductServiceError('storage_read_failed', 'Không thể đọc dữ liệu cục bộ.', {
        cause: error instanceof Error ? error.name : 'unknown',
      });
    }
  }

  async save(value: T): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      assertNoImageBinary(serialized);
      await AsyncStorage.setItem(this.key, serialized);
    } catch (error) {
      if (error instanceof ProductServiceError) {
        throw error;
      }
      throw new ProductServiceError('storage_write_failed', 'Không thể lưu dữ liệu cục bộ.', {
        cause: error instanceof Error ? error.name : 'unknown',
      });
    }
  }

  async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.key);
    } catch (error) {
      throw new ProductServiceError('storage_write_failed', 'Không thể xóa dữ liệu cục bộ.', {
        cause: error instanceof Error ? error.name : 'unknown',
      });
    }
  }
}

export class MemoryMockStateStorage<T> implements MockStateStorage<T> {
  private value: T | null;

  constructor(initialValue: T | null = null) {
    this.value = initialValue;
  }

  async load(): Promise<T | null> {
    return this.value === null ? null : clone(this.value);
  }

  async save(value: T): Promise<void> {
    const serialized = JSON.stringify(value);
    assertNoImageBinary(serialized);
    this.value = clone(value);
  }

  async clear(): Promise<void> {
    this.value = null;
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
