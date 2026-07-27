import { describe, expect, it } from 'vitest';
import {
  parseWebModelManifest,
  resolveWebModelFiles,
  WEB_SEGMENTATION_PART,
  type WebModelManifest,
} from './webModelManifest';

const requiredParts = [
  ['runtime-config.json', 10],
  ['scheduler/scheduler_config.json', 20],
  ['text_encoder/model.onnx', 30],
  ['tokenizer/tokenizer.json', 40],
  ['tokenizer/tokenizer_config.json', 50],
  ['unet/model.onnx', 60],
  ['vae_decoder/model.onnx', 70],
] as const;

function manifest(overrides: Partial<WebModelManifest> = {}): WebModelManifest {
  return {
    manifestVersion: '1.0',
    modelId: 'lcm-sd15-chibi',
    modelVersion: '1.0.1',
    artifactBytes: 280,
    parts: requiredParts.map(([path, bytes]) => ({
      name: path.replaceAll('/', '--'),
      path,
      bytes,
      sha256: 'a'.repeat(64),
      url: `https://example.test/${path}`,
    })),
    ...overrides,
  };
}

describe('parseWebModelManifest', () => {
  it('adds the pinned segmentation model and resolves project URLs', () => {
    const parsed = parseWebModelManifest(JSON.stringify(manifest()));

    expect(resolveWebModelFiles(parsed, 'http://127.0.0.1:8790/')).toMatchObject({
      modelId: 'lcm-sd15-chibi',
      modelVersion: '1.0.1',
      unetUrl: 'http://127.0.0.1:8790/unet/model.onnx',
      segmentationUrl: 'http://127.0.0.1:8790/segmentation/u2netp.onnx',
    });
    expect(parsed.parts.at(-1)).toEqual(WEB_SEGMENTATION_PART);
  });

  it.each([
    ['mismatched model ID', { modelId: 'other' }],
    ['mismatched model version', { modelVersion: '9.9.9' }],
    ['mismatched artifact bytes', { artifactBytes: 281 }],
    ['missing required part', { parts: manifest().parts.slice(1) }],
    [
      'traversal path',
      {
        parts: manifest().parts.map((part, index) =>
          index === 0 ? { ...part, path: '../runtime-config.json' } : part,
        ),
      },
    ],
  ])('rejects %s', (_label, overrides) => {
    expect(() =>
      parseWebModelManifest(JSON.stringify(manifest(overrides as Partial<WebModelManifest>))),
    ).toThrow();
  });
});
