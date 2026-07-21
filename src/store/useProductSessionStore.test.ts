import { beforeEach, describe, expect, it } from 'vitest';
import { useProductSessionStore } from './useProductSessionStore';

describe('useProductSessionStore resume state', () => {
  beforeEach(() => {
    useProductSessionStore.setState({
      activeCharacterId: 'character-1',
      activeJobId: 'job-1',
      activePackId: 'pack-1',
      hasHydrated: true,
      isHydrating: false,
      isResuming: true,
      hasAttemptedResume: true,
      hydrationError: null,
    });
  });

  it('clears stale entity IDs without re-enabling bootstrap resume', () => {
    useProductSessionStore.getState().clearActiveFlow();

    const state = useProductSessionStore.getState();
    expect(state.activeCharacterId).toBeNull();
    expect(state.activeJobId).toBeNull();
    expect(state.activePackId).toBeNull();
    expect(state.isResuming).toBe(false);
    expect(state.hasAttemptedResume).toBe(true);
  });

  it('only re-enables resume through the explicit reset action', () => {
    useProductSessionStore.getState().resetResumeState();

    expect(useProductSessionStore.getState().hasAttemptedResume).toBe(false);
  });
});
