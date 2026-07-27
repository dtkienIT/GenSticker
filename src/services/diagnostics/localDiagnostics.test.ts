import 'fake-indexeddb/auto';
import { deleteDB } from 'idb';
import { afterEach, describe, expect, it } from 'vitest';
import { LocalDiagnostics } from './localDiagnostics';

const databaseNames: string[] = [];
const instances: LocalDiagnostics[] = [];

afterEach(async () => {
  await Promise.all(instances.splice(0).map((instance) => instance.close()));
  await Promise.all(databaseNames.splice(0).map((name) => deleteDB(name)));
});

describe('LocalDiagnostics', () => {
  it('records, exports, and clears local events without raw prompts', async () => {
    const databaseName = `diagnostics-${crypto.randomUUID()}`;
    databaseNames.push(databaseName);
    const diagnostics = new LocalDiagnostics({
      databaseName,
      createId: () => 'event-1',
      now: () => '2026-07-27T00:00:00.000Z',
    });
    instances.push(diagnostics);
    await diagnostics.record({
      kind: 'error',
      detailCode: 'PROMPT_BLOCKED',
      metadata: { prompt: 'blocked raw text', adapter: 'webgpu' },
    });

    await expect(diagnostics.list()).resolves.toEqual([
      expect.objectContaining({
        id: 'event-1',
        metadata: { adapter: 'webgpu' },
      }),
    ]);
    expect(await diagnostics.exportJson()).not.toContain('blocked raw text');
    await diagnostics.clear();
    await expect(diagnostics.list()).resolves.toEqual([]);
  });
});
