import Constants from 'expo-constants';
import { Platform } from 'react-native';

function withoutTrailingSlash(value: string): string {
  return value.replace(/\/+$/u, '');
}

function hostnameFromMetro(hostUri: string): string | null {
  try {
    const parsed = new URL(hostUri.includes('://') ? hostUri : `http://${hostUri}`);
    if (parsed.hostname.startsWith('[')) return parsed.hostname;
    return parsed.hostname.includes(':') ? `[${parsed.hostname}]` : parsed.hostname;
  } catch {
    return null;
  }
}

/**
 * Dynamically resolves the backend base URL.
 * In development, it attempts to use the host machine's IP (from Metro)
 * so that physical devices on the same Wi-Fi can connect without manual configuration.
 */
export function resolveBaseUrl(): string {
  // If a specific URL is provided via ENV, prioritize it (e.g., for production)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return withoutTrailingSlash(process.env.EXPO_PUBLIC_API_URL);
  }

  const defaultHost = Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';
  const defaultUrl = `http://${defaultHost}:8000/api/v1`;

  try {
    const hostUri = Constants.expoConfig?.hostUri;

    if (hostUri) {
      // hostUri is usually something like "192.168.1.100:8081" in LAN mode.
      const hostname = hostnameFromMetro(hostUri);
      if (hostname) return `http://${hostname}:8000/api/v1`;
    }
  } catch {
    // Fall through to the emulator/simulator loopback URL.
  }

  return defaultUrl;
}
