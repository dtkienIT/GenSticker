import { describe, expect, it } from 'vitest';
import { stickerPromptSchema } from './stickerSchemas';

describe('stickerPromptSchema', () => {
  it('trims a valid prompt and keeps the selected style', () => {
    expect(
      stickerPromptSchema.parse({ prompt: '  A cat with boba  ', stylePresetId: 'cartoon' }),
    ).toEqual({ prompt: 'A cat with boba', stylePresetId: 'cartoon' });
  });

  it('rejects prompts shorter than three characters after trimming', () => {
    expect(() => stickerPromptSchema.parse({ prompt: '  a ', stylePresetId: 'chibi' })).toThrow();
  });

  it('rejects prompts longer than 300 characters', () => {
    expect(() =>
      stickerPromptSchema.parse({ prompt: 'a'.repeat(301), stylePresetId: 'meme' }),
    ).toThrow();
  });
});
