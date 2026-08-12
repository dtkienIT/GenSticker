import { Platform } from 'react-native';

const fallbackOrigin = Platform.select({
  android: 'http://10.0.2.2:8000',
  default: 'http://127.0.0.1:8000',
});

function trimSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

const configuredOrigin = process.env.EXPO_PUBLIC_API_URL?.trim();
export const API_ORIGIN = trimSlash(configuredOrigin || fallbackOrigin);
export const API_BASE_URL = API_ORIGIN.endsWith('/api/v1')
  ? API_ORIGIN
  : `${API_ORIGIN}/api/v1`;

export const CONSENT_VERSION =
  process.env.EXPO_PUBLIC_CONSENT_VERSION?.trim() || 'mvp-vi-v1';
// Backend contract của build hiện tại luôn trả pipeline mock. Đây cố ý là hằng
// compile-time để không thể vô tình tắt disclosure bằng một biến môi trường.
export const IS_DEMO = true as const;
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || '';
export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';
export const USE_SUPABASE_AUTH = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
