export interface ImageTensor {
  data: Float32Array;
  dims: [1, 3, number, number];
}

function bilinearSample(
  values: ArrayLike<number>,
  sourceWidth: number,
  sourceHeight: number,
  x: number,
  y: number,
  channels: number,
  channel: number,
): number {
  const clampedX = Math.max(0, Math.min(sourceWidth - 1, x));
  const clampedY = Math.max(0, Math.min(sourceHeight - 1, y));
  const x0 = Math.floor(clampedX);
  const y0 = Math.floor(clampedY);
  const x1 = Math.min(sourceWidth - 1, x0 + 1);
  const y1 = Math.min(sourceHeight - 1, y0 + 1);
  const xWeight = clampedX - x0;
  const yWeight = clampedY - y0;
  const at = (sampleX: number, sampleY: number) =>
    values[(sampleY * sourceWidth + sampleX) * channels + channel] ?? 0;
  const top = at(x0, y0) * (1 - xWeight) + at(x1, y0) * xWeight;
  const bottom = at(x0, y1) * (1 - xWeight) + at(x1, y1) * xWeight;
  return top * (1 - yWeight) + bottom * yWeight;
}

export function preprocessU2Net(
  rgba: Uint8ClampedArray,
  sourceWidth: number,
  sourceHeight: number,
  targetSize = 320,
): ImageTensor {
  if (rgba.length !== sourceWidth * sourceHeight * 4) {
    throw new Error('Invalid RGBA image dimensions');
  }
  const planeSize = targetSize * targetSize;
  const data = new Float32Array(planeSize * 3);
  const means = [0.485, 0.456, 0.406] as const;
  const deviations = [0.229, 0.224, 0.225] as const;

  for (let y = 0; y < targetSize; y += 1) {
    const sourceY = ((y + 0.5) * sourceHeight) / targetSize - 0.5;
    for (let x = 0; x < targetSize; x += 1) {
      const sourceX = ((x + 0.5) * sourceWidth) / targetSize - 0.5;
      const outputIndex = y * targetSize + x;
      for (let channel = 0; channel < 3; channel += 1) {
        const value =
          bilinearSample(rgba, sourceWidth, sourceHeight, sourceX, sourceY, 4, channel) / 255;
        data[channel * planeSize + outputIndex] = (value - means[channel]) / deviations[channel];
      }
    }
  }
  return { data, dims: [1, 3, targetSize, targetSize] };
}

export function normalizeMask(values: Float32Array): Float32Array {
  if (values.length === 0) return new Float32Array();
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
  }
  const range = maximum - minimum;
  if (range <= Number.EPSILON) {
    return new Float32Array(values.length);
  }
  return Float32Array.from(values, (value) => Math.max(0, Math.min(1, (value - minimum) / range)));
}

export function resizeMask(
  mask: Float32Array,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
): Float32Array {
  if (mask.length !== sourceWidth * sourceHeight) {
    throw new Error('Invalid mask dimensions');
  }
  const result = new Float32Array(targetWidth * targetHeight);
  for (let y = 0; y < targetHeight; y += 1) {
    const sourceY = ((y + 0.5) * sourceHeight) / targetHeight - 0.5;
    for (let x = 0; x < targetWidth; x += 1) {
      const sourceX = ((x + 0.5) * sourceWidth) / targetWidth - 0.5;
      result[y * targetWidth + x] = bilinearSample(
        mask,
        sourceWidth,
        sourceHeight,
        sourceX,
        sourceY,
        1,
        0,
      );
    }
  }
  return result;
}

export function applyMaskAlpha(rgba: Uint8ClampedArray, mask: Float32Array): Uint8ClampedArray {
  if (rgba.length !== mask.length * 4) {
    throw new Error('Mask and RGBA dimensions do not match');
  }
  const result = new Uint8ClampedArray(rgba);
  for (let index = 0; index < mask.length; index += 1) {
    result[index * 4 + 3] = Math.round(Math.max(0, Math.min(1, mask[index])) * 255);
  }
  return result;
}
