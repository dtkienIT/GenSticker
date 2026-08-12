import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  USE_SUPABASE_AUTH,
} from '@/config/env';

import { secureStoreAuthStorage } from './secure-store-adapter';

const DEVICE_KEY = 'duhat.device-id.v1';
let inMemoryDeviceId: string | undefined;
let supabase: SupabaseClient | undefined;

async function getDeviceId(): Promise<string> {
  if (inMemoryDeviceId) return inMemoryDeviceId;
  const saved = await SecureStore.getItemAsync(DEVICE_KEY);
  if (saved) {
    inMemoryDeviceId = saved;
    return saved;
  }
  const created = Crypto.randomUUID();
  await SecureStore.setItemAsync(DEVICE_KEY, created);
  inMemoryDeviceId = created;
  return created;
}

function getSupabase(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: secureStoreAuthStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  return supabase;
}

async function getSupabaseToken(): Promise<string> {
  const client = getSupabase();
  let { data, error } = await client.auth.getSession();
  if (error) throw new Error('AUTH_UNAVAILABLE');
  if (!data.session) {
    const result = await client.auth.signInAnonymously();
    error = result.error;
    data = { session: result.data.session };
  }
  if (error || !data.session?.access_token) throw new Error('AUTH_UNAVAILABLE');
  return data.session.access_token;
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  if (USE_SUPABASE_AUTH) {
    return { Authorization: `Bearer ${await getSupabaseToken()}` };
  }
  return { 'X-Device-ID': await getDeviceId() };
}
