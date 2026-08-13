import { describe, expect, it } from 'vitest';

import { resolveSupabasePublicKey } from '../src/config/supabase-key';

describe('resolveSupabasePublicKey', () => {
  it('prefers the current publishable key', () => {
    expect(resolveSupabasePublicKey('sb_publishable_current', 'legacy-anon')).toBe(
      'sb_publishable_current',
    );
  });

  it('keeps the legacy anon key as a fallback', () => {
    expect(resolveSupabasePublicKey('  ', 'legacy-anon')).toBe('legacy-anon');
  });

  it('returns an empty value when neither key is configured', () => {
    expect(resolveSupabasePublicKey(undefined, undefined)).toBe('');
  });
});
