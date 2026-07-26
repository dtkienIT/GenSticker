import { describe, expect, test } from 'vitest';
import { presentLocalModelSetup } from './localModelSetupPresentation';

describe('presentLocalModelSetup', () => {
  test('offers staged import for a missing development model', () => {
    expect(
      presentLocalModelSetup(
        {
          status: 'missing',
          modelId: 'lcm-sd15-chibi',
          modelVersion: '1.0.0',
          downloadedBytes: 0,
          totalBytes: 100,
        },
        true,
      ),
    ).toEqual(
      expect.objectContaining({
        action: 'installLocal',
        buttonLabel: 'Install staged local model',
      }),
    );
  });

  test('explains when model files have not been staged', () => {
    expect(
      presentLocalModelSetup(
        {
          status: 'failed',
          modelId: 'lcm-sd15-chibi',
          modelVersion: '1.0.0',
          downloadedBytes: 0,
          totalBytes: 100,
          errorCode: 'LOCAL_MODEL_NOT_STAGED',
        },
        true,
      ).message,
    ).toContain('stage-local-model.ps1');
  });

  test('does not replace production download action', () => {
    expect(presentLocalModelSetup(null, false).action).toBe('download');
  });
});
