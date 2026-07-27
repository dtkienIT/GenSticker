import { describe, expect, it } from 'vitest';
import { runtimeStatusCopy, workspaceLayout } from './runtimePresentation';

describe('web runtime presentation', () => {
  it('uses browser-local copy for the web runtime', () => {
    expect(runtimeStatusCopy('web', 'ready')).toContain('locally in this browser');
  });

  it('preserves native on-device copy', () => {
    expect(runtimeStatusCopy('native', 'ready')).toContain('on this device');
  });

  it('selects a 3:2 desktop workspace at 1024 pixels', () => {
    expect(workspaceLayout(1024)).toEqual({
      direction: 'row',
      promptFlex: 3,
      sideFlex: 2,
    });
    expect(workspaceLayout(800).direction).toBe('column');
  });
});
