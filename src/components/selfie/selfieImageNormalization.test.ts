import { describe, expect, it } from 'vitest';

import { getNormalizedSelfieDimensions, MAX_SELFIE_DIMENSION } from './selfieImageNormalization';

describe('getNormalizedSelfieDimensions', () => {
  it('keeps images that already fit the upload dimensions', () => {
    expect(getNormalizedSelfieDimensions(1200, 1600)).toEqual({
      width: 1200,
      height: 1600,
    });
  });

  it('scales portrait images while preserving their aspect ratio', () => {
    expect(getNormalizedSelfieDimensions(3000, 4000)).toEqual({
      width: 1536,
      height: MAX_SELFIE_DIMENSION,
    });
  });

  it('scales landscape images while preserving their aspect ratio', () => {
    expect(getNormalizedSelfieDimensions(4000, 3000)).toEqual({
      width: MAX_SELFIE_DIMENSION,
      height: 1536,
    });
  });
});
