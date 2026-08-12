import { describe, expect, it } from 'vitest';

import {
  assertExactlyEight,
  generationJobSchema,
  packsSchema,
  stickerSetSchema,
} from '../src/api/contracts';

function wireSticker(ordinal: number) {
  return {
    id: `sticker-${ordinal}`,
    ordinal,
    expression_key: `expression-${ordinal}`,
    mime_type: 'image/svg+xml',
    moderation_status: 'passed',
    asset_url: `/api/v1/stickers/sticker-${ordinal}/asset`,
    created_at: '2026-08-12T09:00:00Z',
  };
}

describe('API contracts', () => {
  it('normalizes a succeeded generation job', () => {
    const result = generationJobSchema.parse({
      id: 'job-1',
      source_image_id: 'source-1',
      status: 'succeeded',
      stage: 'ready',
      progress: 100,
      safe_error_code: null,
      sticker_set_id: 'set-1',
    });
    expect(result).toMatchObject({ id: 'job-1', status: 'succeeded', setId: 'set-1' });
  });

  it('requires exactly eight unique ordinals for a full-set preview', () => {
    const set = stickerSetSchema.parse({
      id: 'set-1',
      job_id: 'job-1',
      stickers: Array.from({ length: 8 }, (_, index) => wireSticker(index + 1)),
    });
    expect(assertExactlyEight(set.stickers)).toHaveLength(8);
    expect(() => assertExactlyEight(set.stickers.slice(0, 7))).toThrow('INVALID_STICKER_COUNT');
  });

  it('maps backend pack title and list envelope', () => {
    const packs = packsSchema.parse({
      items: [
        {
          id: 'pack-1',
          title: 'Sticker của tôi',
          stickers: [wireSticker(1)],
        },
      ],
    });
    expect(packs[0]?.name).toBe('Sticker của tôi');
  });
});
