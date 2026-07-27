const RANDOM_MULTIPLIER = 0x5deece66dn;
const RANDOM_ADDEND = 0xbn;
const RANDOM_MASK = (1n << 48n) - 1n;
const FOUR_STEP_ALPHA_CUMPROD = [
  0.00466009508818388, 0.05221289023756981, 0.27766942977905273, 0.6589752435684204,
] as const;

const floatView = new Float32Array(1);
const intView = new Uint32Array(floatView.buffer);

export class JavaRandom {
  private seed: bigint;
  private cachedGaussian: number | null = null;

  constructor(seed: number | bigint) {
    this.seed = (BigInt(seed) ^ RANDOM_MULTIPLIER) & RANDOM_MASK;
  }

  nextDouble(): number {
    const high = this.nextBits(26);
    const low = this.nextBits(27);
    return (high * 2 ** 27 + low) / 2 ** 53;
  }

  nextGaussian(): number {
    if (this.cachedGaussian !== null) {
      const cached = this.cachedGaussian;
      this.cachedGaussian = null;
      return cached;
    }
    while (true) {
      const first = 2 * this.nextDouble() - 1;
      const second = 2 * this.nextDouble() - 1;
      const radius = first * first + second * second;
      if (radius >= 1 || radius === 0) continue;
      const multiplier = Math.sqrt((-2 * Math.log(radius)) / radius);
      this.cachedGaussian = second * multiplier;
      return first * multiplier;
    }
  }

  private nextBits(bits: number): number {
    this.seed = (this.seed * RANDOM_MULTIPLIER + RANDOM_ADDEND) & RANDOM_MASK;
    return Number(this.seed >> BigInt(48 - bits));
  }
}

export function seededLatentsGaussian(seed: number | bigint, size: number): Float32Array {
  const random = new JavaRandom(seed);
  return Float32Array.from({ length: size }, () => {
    const first = Math.max(random.nextDouble(), Number.MIN_VALUE);
    const second = random.nextDouble();
    return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second);
  });
}

export function float32ToFloat16(value: number): number {
  floatView[0] = value;
  const bits = intView[0] >>> 0;
  const sign = (bits >>> 16) & 0x8000;
  const magnitude = ((bits & 0x7fffffff) + 0x1000) >>> 0;
  let half: number;
  if (magnitude >= 0x47800000) {
    if ((bits & 0x7fffffff) >= 0x47800000) {
      half = magnitude < 0x7f800000 ? 0x7c00 : 0x7c00 | ((bits & 0x007fffff) >>> 13);
    } else {
      half = 0x7bff;
    }
  } else if (magnitude >= 0x38800000) {
    half = (magnitude - 0x38000000) >>> 13;
  } else if (magnitude < 0x33000000) {
    half = 0;
  } else {
    const exponent = (bits & 0x7fffffff) >>> 23;
    half = (((bits & 0x7fffff) | 0x800000) + (0x800000 >>> (exponent - 102))) >>> (126 - exponent);
  }
  return (sign | half) & 0xffff;
}

export function float16ToFloat32(value: number): number {
  const half = value & 0xffff;
  const sign = (half & 0x8000) << 16;
  let exponent = (half >>> 10) & 0x1f;
  let fraction = half & 0x03ff;
  let bits: number;
  if (exponent === 0) {
    if (fraction === 0) {
      bits = sign;
    } else {
      while ((fraction & 0x0400) === 0) {
        fraction <<= 1;
        exponent -= 1;
      }
      fraction &= 0x03ff;
      bits = sign | ((exponent + 127 - 15 + 1) << 23) | (fraction << 13);
    }
  } else if (exponent === 0x1f) {
    bits = sign | 0x7f800000 | (fraction << 13);
  } else {
    bits = sign | ((exponent + 127 - 15) << 23) | (fraction << 13);
  }
  intView[0] = bits >>> 0;
  return floatView[0];
}

export function tensorDataToFloat32(
  type: 'float16' | 'float32',
  data: ArrayLike<number>,
): Float32Array {
  if (type === 'float16' && data instanceof Uint16Array) {
    return Float32Array.from(data, (value) => float16ToFloat32(value));
  }
  return Float32Array.from(data);
}

export function guidedNoise(
  output: Float32Array,
  latentSize: number,
  guidance: number,
): Float32Array {
  if (output.length !== latentSize * 2) {
    throw new Error('Guidance input must contain unconditional and conditional batches');
  }
  return Float32Array.from({ length: latentSize }, (_, index) => {
    const unconditional = output[index];
    return unconditional + guidance * (output[index + latentSize] - unconditional);
  });
}

export function lcmTimesteps(inferenceSteps: number): number[] {
  if (!Number.isInteger(inferenceSteps) || inferenceSteps < 1 || inferenceSteps > 50) {
    throw new Error('LCM inference steps must be between 1 and 50');
  }
  const origin = Array.from({ length: 50 }, (_, index) => 999 - index * 20);
  return Array.from(
    { length: inferenceSteps },
    (_, index) => origin[Math.floor((index * 50) / inferenceSteps)],
  );
}

export function lcmStep(
  sample: number,
  modelOutput: number,
  noise: number,
  stepIndex: number,
): number {
  const alpha = FOUR_STEP_ALPHA_CUMPROD[stepIndex];
  if (alpha === undefined) throw new Error('LCM step index must be between 0 and 3');
  const beta = 1 - alpha;
  const predictedOriginal = (sample - Math.sqrt(beta) * modelOutput) / Math.sqrt(alpha);
  const scaledTimestep = lcmTimesteps(4)[stepIndex] * 10;
  const sigmaDataSquared = 0.25;
  const denominator = scaledTimestep * scaledTimestep + sigmaDataSquared;
  const skip = sigmaDataSquared / denominator;
  const output = scaledTimestep / Math.sqrt(denominator);
  const denoised = skip * sample + output * predictedOriginal;
  if (stepIndex === FOUR_STEP_ALPHA_CUMPROD.length - 1) return denoised;
  const previousAlpha = FOUR_STEP_ALPHA_CUMPROD[stepIndex + 1];
  return Math.sqrt(previousAlpha) * denoised + Math.sqrt(1 - previousAlpha) * noise;
}

export function decodedRgba(chw: Float32Array, width: number, height: number): Uint8ClampedArray {
  const plane = width * height;
  if (chw.length !== plane * 3) throw new Error('Decoded tensor must contain three CHW planes');
  const rgba = new Uint8ClampedArray(plane * 4);
  for (let index = 0; index < plane; index += 1) {
    const offset = index * 4;
    rgba[offset] = decodedChannel(chw[index]);
    rgba[offset + 1] = decodedChannel(chw[plane + index]);
    rgba[offset + 2] = decodedChannel(chw[plane * 2 + index]);
    rgba[offset + 3] = 255;
  }
  return rgba;
}

export function composeAlpha(argb: number, mask: number): number {
  const clamped = Math.min(1, Math.max(0, mask));
  const smooth = clamped * clamped * (3 - 2 * clamped);
  const alpha = Math.round(smooth * 255);
  return ((alpha << 24) | (argb & 0x00ffffff)) >>> 0;
}

function decodedChannel(value: number): number {
  return Math.min(255, Math.max(0, Math.round((Math.min(1, Math.max(-1, value)) + 1) * 127.5)));
}
