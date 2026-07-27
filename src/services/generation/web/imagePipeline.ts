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

export function retainLargestMaskComponent(
  mask: Float32Array,
  width: number,
  height: number,
  threshold = 0.25,
  openingRadius = 0,
): Float32Array {
  if (mask.length !== width * height) {
    throw new Error('Invalid mask dimensions');
  }
  const foreground = Uint8Array.from(mask, (value) => (value >= threshold ? 1 : 0));
  const componentInput =
    openingRadius > 0 ? erodeBinary(foreground, width, height, openingRadius) : foreground;
  const labels = new Int32Array(mask.length);
  const queue = new Int32Array(mask.length);
  let nextLabel = 0;
  let largestLabel = 0;
  let largestSize = 0;

  for (let start = 0; start < mask.length; start += 1) {
    if (componentInput[start] === 0 || labels[start] !== 0) continue;
    nextLabel += 1;
    let head = 0;
    let tail = 1;
    queue[0] = start;
    labels[start] = nextLabel;

    while (head < tail) {
      const index = queue[head];
      head += 1;
      const x = index % width;
      const y = Math.floor(index / width);
      const neighbors = [
        x > 0 ? index - 1 : -1,
        x + 1 < width ? index + 1 : -1,
        y > 0 ? index - width : -1,
        y + 1 < height ? index + width : -1,
      ];
      for (const neighbor of neighbors) {
        if (neighbor >= 0 && labels[neighbor] === 0 && componentInput[neighbor] === 1) {
          labels[neighbor] = nextLabel;
          queue[tail] = neighbor;
          tail += 1;
        }
      }
    }

    if (tail > largestSize) {
      largestSize = tail;
      largestLabel = nextLabel;
    }
  }

  const selected = Uint8Array.from(labels, (label) => (label === largestLabel ? 1 : 0));
  const retained =
    openingRadius > 0 ? dilateBinary(selected, width, height, openingRadius) : selected;
  return Float32Array.from(mask, (value, index) => (retained[index] === 1 ? value : 0));
}

function erodeBinary(
  source: Uint8Array,
  width: number,
  height: number,
  radius: number,
): Uint8Array {
  const result = new Uint8Array(source.length);
  for (let y = radius; y < height - radius; y += 1) {
    for (let x = radius; x < width - radius; x += 1) {
      let keep = true;
      for (let offsetY = -radius; offsetY <= radius && keep; offsetY += 1) {
        for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
          if (source[(y + offsetY) * width + x + offsetX] === 0) {
            keep = false;
            break;
          }
        }
      }
      if (keep) result[y * width + x] = 1;
    }
  }
  return result;
}

function dilateBinary(
  source: Uint8Array,
  width: number,
  height: number,
  radius: number,
): Uint8Array {
  const result = new Uint8Array(source.length);
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === 0) continue;
    const x = index % width;
    const y = Math.floor(index / width);
    for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
      const targetY = y + offsetY;
      if (targetY < 0 || targetY >= height) continue;
      for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
        const targetX = x + offsetX;
        if (targetX >= 0 && targetX < width) {
          result[targetY * width + targetX] = 1;
        }
      }
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
