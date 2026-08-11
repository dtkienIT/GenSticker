import test from 'node:test';
import assert from 'node:assert/strict';

import { getErrorRecoveryAction } from '../src/utils/errorRecovery.ts';

test('retries a rejected partial job instead of restarting it', () => {
  assert.equal(
    getErrorRecoveryAction({
      jobId: 'job_partial',
      qualityStatus: 'rejected',
      previewCount: 2,
    }),
    'retry-partial',
  );
});

test('restarts when no reusable partial job exists', () => {
  assert.equal(
    getErrorRecoveryAction({
      jobId: null,
      qualityStatus: null,
      previewCount: 0,
    }),
    'restart',
  );
});
