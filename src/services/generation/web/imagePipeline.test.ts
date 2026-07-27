import { describe, expect, it } from 'vitest';
import { applyMaskAlpha, normalizeMask, preprocessU2Net, resizeMask } from './imagePipeline';

describe('web image pipeline', () => {
  it('creates a normalized NCHW 320px U²-Net input', () => {
    const rgba = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255]);

    const tensor = preprocessU2Net(rgba, 2, 1);

    expect(tensor.dims).toEqual([1, 3, 320, 320]);
    expect(tensor.data).toHaveLength(3 * 320 * 320);
    expect(tensor.data[0]).toBeCloseTo((1 - 0.485) / 0.229);
    expect(tensor.data[320 * 320]).toBeCloseTo((0 - 0.456) / 0.224);
  });

  it('normalizes a raw mask into the zero-to-one interval', () => {
    expect(Array.from(normalizeMask(new Float32Array([-2, 0, 2])))).toEqual([0, 0.5, 1]);
  });

  it('resizes a mask and composes it into RGBA alpha', () => {
    const mask = resizeMask(new Float32Array([0, 1, 1, 0]), 2, 2, 1, 1);
    const rgba = new Uint8ClampedArray([10, 20, 30, 255]);

    expect(mask[0]).toBeCloseTo(0.5);
    expect(Array.from(applyMaskAlpha(rgba, mask))).toEqual([10, 20, 30, 128]);
  });
});
