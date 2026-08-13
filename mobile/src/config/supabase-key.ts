export function resolveSupabasePublicKey(
  publishableKey: string | undefined,
  legacyAnonKey: string | undefined,
): string {
  return publishableKey?.trim() || legacyAnonKey?.trim() || '';
}
