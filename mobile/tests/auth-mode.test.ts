import { describe, expect, it } from 'vitest';

import { resolveAuthMode } from '../src/config/auth-mode';

describe('resolveAuthMode', () => {
  it('allows an explicit local mode even when Supabase is configured', () => {
    expect(resolveAuthMode('local', true)).toBe('local');
  });

  it('uses Supabase by default when its configuration is complete', () => {
    expect(resolveAuthMode(undefined, true)).toBe('supabase');
  });

  it('does not allow Supabase mode without its public configuration', () => {
    expect(resolveAuthMode('supabase', false)).toBe('local');
  });
});
