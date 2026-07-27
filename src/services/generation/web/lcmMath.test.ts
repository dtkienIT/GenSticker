import { describe, expect, test } from 'vitest';
import {
  JavaRandom,
  composeAlpha,
  decodedRgba,
  float16ToFloat32,
  float32ToFloat16,
  guidedNoise,
  lcmStep,
  lcmTimesteps,
  seededLatentsGaussian,
} from './lcmMath';

describe('LCM web numeric parity', () => {
  test('selects the four Android scheduler timesteps', () => {
    expect(lcmTimesteps(4)).toEqual([999, 759, 499, 259]);
  });

  test('round-trips representative finite FP16 values', () => {
    for (const value of [0, -0, 1.5, -3.25, 65504, 0.00006103515625]) {
      expect(float16ToFloat32(float32ToFloat16(value))).toBeCloseTo(value, 5);
    }
  });

  test('matches Java Random double and Gaussian sequences', () => {
    const doubleRandom = new JavaRandom(42);
    expect(doubleRandom.nextDouble()).toBeCloseTo(0.7275636800328681, 15);

    const gaussianRandom = new JavaRandom(42);
    expect(gaussianRandom.nextGaussian()).toBeCloseTo(1.141905315473055, 14);
    expect(gaussianRandom.nextGaussian()).toBeCloseTo(0.919407948982788, 14);
  });

  test('matches Kotlin seeded latent Gaussian sampling', () => {
    expect(Array.from(seededLatentsGaussian(42, 3))).toEqual([
      expect.closeTo(-0.3249011602434719, 6),
      expect.closeTo(-0.25959749624431383, 6),
      expect.closeTo(0.7411129889187759, 6),
    ]);
  });

  test('applies classifier-free guidance to paired batches', () => {
    expect(Array.from(guidedNoise(new Float32Array([1, 3]), 1, 1.5))).toEqual([4]);
  });

  test('matches the Android LCM step coefficients', () => {
    expect(lcmStep(0.25, -0.5, 0.1, 0)).toBeCloseTo(2.6039068813217656, 6);
    expect(lcmStep(0.25, -0.5, 0.1, 3)).toBeCloseTo(0.6676579390095563, 6);
  });

  test('decodes NCHW VAE output to clamped RGBA pixels', () => {
    const rgba = decodedRgba(new Float32Array([-1, 1, 0]), 1, 1);
    expect(Array.from(rgba)).toEqual([0, 255, 128, 255]);
  });

  test('smooths and composes the segmentation alpha channel', () => {
    expect(composeAlpha(0xff336699, 0) >>> 0).toBe(0x00336699);
    expect(composeAlpha(0xff336699, 1) >>> 0).toBe(0xff336699);
    expect(composeAlpha(0xff336699, 0.5) >>> 24).toBe(128);
  });
});
