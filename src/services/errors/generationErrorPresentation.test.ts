import { describe, expect, it } from 'vitest';
import { GenerationFailure } from '../generation/types';
import { presentStickerError } from './generationErrorPresentation';

describe('presentStickerError', () => {
  it.each(['DEVICE_UNSUPPORTED', 'RUNTIME_UNAVAILABLE', 'INSUFFICIENT_MEMORY'] as const)(
    'uses platform-neutral copy for %s',
    (code) => {
      const presentation = presentStickerError(new GenerationFailure(code));

      expect(presentation.message).not.toMatch(/Android/i);
    },
  );
});
