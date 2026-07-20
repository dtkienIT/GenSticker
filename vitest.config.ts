import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'react-native': fileURLToPath(new URL('./src/testing/reactNativeMock.ts', import.meta.url)),
      '@react-native-async-storage/async-storage': fileURLToPath(
        new URL('./src/testing/asyncStorageMock.ts', import.meta.url),
      ),
    },
  },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
