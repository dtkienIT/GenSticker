export type AuthMode = 'local' | 'supabase';

export function resolveAuthMode(
  configuredMode: string | undefined,
  hasSupabaseConfiguration: boolean,
): AuthMode {
  const normalized = configuredMode?.trim().toLowerCase();
  if (normalized === 'local') return 'local';
  return hasSupabaseConfiguration ? 'supabase' : 'local';
}
