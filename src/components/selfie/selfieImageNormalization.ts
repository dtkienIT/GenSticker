export const MAX_SELFIE_DIMENSION = 2048;
export const SELFIE_JPEG_QUALITY = 0.8;

export function getNormalizedSelfieDimensions(
  width: number,
  height: number,
): { width: number; height: number } {
  if (width <= 0 || height <= 0) {
    return { width, height };
  }

  const longestSide = Math.max(width, height);
  if (longestSide <= MAX_SELFIE_DIMENSION) {
    return { width, height };
  }

  const scale = MAX_SELFIE_DIMENSION / longestSide;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
