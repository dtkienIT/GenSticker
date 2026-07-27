export const WEB_MODEL_ID = 'lcm-sd15-chibi';
export const WEB_MODEL_VERSION = '1.0.1';

export interface WebModelPart {
  name: string;
  path: string;
  bytes: number;
  sha256: string;
  url: string;
}

export interface WebModelManifest {
  manifestVersion: string;
  modelId: string;
  modelVersion: string;
  artifactBytes: number;
  parts: WebModelPart[];
}

export interface WebModelFiles {
  modelId: string;
  modelVersion: string;
  manifestUrl: string;
  runtimeConfigUrl: string;
  schedulerUrl: string;
  textEncoderUrl: string;
  tokenizerUrl: string;
  tokenizerConfigUrl: string;
  unetUrl: string;
  vaeDecoderUrl: string;
  segmentationUrl: string;
  parts: ReadonlyArray<WebModelPart & { resolvedUrl: string }>;
}

export const WEB_SEGMENTATION_PART: WebModelPart = {
  name: 'segmentation--u2netp.onnx',
  path: 'segmentation/u2netp.onnx',
  bytes: 4_574_861,
  sha256: '309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8',
  url: 'https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx',
};

const REQUIRED_PATHS = [
  'runtime-config.json',
  'scheduler/scheduler_config.json',
  'text_encoder/model.onnx',
  'tokenizer/tokenizer.json',
  'tokenizer/tokenizer_config.json',
  'unet/model.onnx',
  'vae_decoder/model.onnx',
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isSafeRelativePath(path: string): boolean {
  return (
    path.length > 0 &&
    !path.startsWith('/') &&
    !path.includes('\\') &&
    !path.includes('?') &&
    !path.includes('#') &&
    path.split('/').every((segment) => segment !== '' && segment !== '.' && segment !== '..')
  );
}

function readPart(value: unknown): WebModelPart {
  if (!isRecord(value)) {
    throw new Error('Invalid model part');
  }
  const { name, path, bytes, sha256, url } = value;
  if (
    typeof name !== 'string' ||
    typeof path !== 'string' ||
    !isSafeRelativePath(path) ||
    typeof bytes !== 'number' ||
    !Number.isSafeInteger(bytes) ||
    bytes < 0 ||
    typeof sha256 !== 'string' ||
    !/^[a-f0-9]{64}$/.test(sha256) ||
    typeof url !== 'string'
  ) {
    throw new Error(`Invalid model part: ${String(path)}`);
  }
  return { name, path, bytes, sha256, url };
}

export function parseWebModelManifest(json: string): WebModelManifest {
  const value: unknown = JSON.parse(json);
  if (!isRecord(value) || !Array.isArray(value.parts)) {
    throw new Error('Invalid web model manifest');
  }
  if (value.modelId !== WEB_MODEL_ID || value.modelVersion !== WEB_MODEL_VERSION) {
    throw new Error('The project model does not match this web build');
  }
  if (
    typeof value.manifestVersion !== 'string' ||
    typeof value.artifactBytes !== 'number' ||
    !Number.isSafeInteger(value.artifactBytes)
  ) {
    throw new Error('Invalid model manifest metadata');
  }

  const sourceParts = value.parts.map(readPart);
  const sourcePaths = new Set(sourceParts.map((part) => part.path));
  if (!REQUIRED_PATHS.every((path) => sourcePaths.has(path))) {
    throw new Error('The model manifest is missing a required web artifact');
  }
  if (new Set(sourceParts.map((part) => part.path)).size !== sourceParts.length) {
    throw new Error('The model manifest contains duplicate paths');
  }

  const generationBytes = sourceParts.reduce((total, part) => total + part.bytes, 0);
  const existingSegmentation = sourceParts.find((part) => part.path === WEB_SEGMENTATION_PART.path);
  const expectedGenerationBytes = existingSegmentation
    ? generationBytes - existingSegmentation.bytes
    : generationBytes;
  if (value.artifactBytes !== expectedGenerationBytes) {
    throw new Error('The model manifest byte total does not match its parts');
  }
  if (
    existingSegmentation &&
    (existingSegmentation.bytes !== WEB_SEGMENTATION_PART.bytes ||
      existingSegmentation.sha256 !== WEB_SEGMENTATION_PART.sha256)
  ) {
    throw new Error('The segmentation model does not match the pinned web artifact');
  }

  const parts = existingSegmentation ? sourceParts : [...sourceParts, { ...WEB_SEGMENTATION_PART }];
  return {
    manifestVersion: value.manifestVersion,
    modelId: WEB_MODEL_ID,
    modelVersion: WEB_MODEL_VERSION,
    artifactBytes: parts.reduce((total, part) => total + part.bytes, 0),
    parts,
  };
}

function resolvePart(
  manifest: WebModelManifest,
  baseUrl: URL,
  path: string,
): WebModelPart & { resolvedUrl: string } {
  const part = manifest.parts.find((candidate) => candidate.path === path);
  if (!part) {
    throw new Error(`Missing model part: ${path}`);
  }
  return { ...part, resolvedUrl: new URL(part.path, baseUrl).href };
}

export function resolveWebModelFiles(
  manifest: WebModelManifest,
  baseUrlValue: string,
): WebModelFiles {
  const baseUrl = new URL(baseUrlValue);
  if (!baseUrl.pathname.endsWith('/')) {
    baseUrl.pathname += '/';
  }
  const parts = manifest.parts.map((part) => resolvePart(manifest, baseUrl, part.path));
  const urlFor = (path: string) => resolvePart(manifest, baseUrl, path).resolvedUrl;

  return {
    modelId: manifest.modelId,
    modelVersion: manifest.modelVersion,
    manifestUrl: new URL('model-distribution.manifest.json', baseUrl).href,
    runtimeConfigUrl: urlFor('runtime-config.json'),
    schedulerUrl: urlFor('scheduler/scheduler_config.json'),
    textEncoderUrl: urlFor('text_encoder/model.onnx'),
    tokenizerUrl: urlFor('tokenizer/tokenizer.json'),
    tokenizerConfigUrl: urlFor('tokenizer/tokenizer_config.json'),
    unetUrl: urlFor('unet/model.onnx'),
    vaeDecoderUrl: urlFor('vae_decoder/model.onnx'),
    segmentationUrl: urlFor(WEB_SEGMENTATION_PART.path),
    parts,
  };
}
