import { describe, expect, test } from 'vitest';
import { ClipTokenizer } from './clipTokenizer';

const PINNED_TOKENIZER = JSON.stringify({
  model: {
    vocab: {
      '<|startoftext|>': 49406,
      '<|endoftext|>': 49407,
      'a</w>': 320,
      'cat</w>': 2368,
    },
    merges: [
      ['a', 't</w>'],
      ['c', 'a'],
      ['c', 'at</w>'],
    ],
  },
});

describe('ClipTokenizer web parity', () => {
  test('encodes and pads the Kotlin CLIP BPE fixture to 77 tokens', () => {
    const ids = ClipTokenizer.fromJson(PINNED_TOKENIZER).encode('A CAT');

    expect(ids).toHaveLength(77);
    expect(ids.slice(0, 4)).toEqual([49406n, 320n, 2368n, 49407n]);
    expect(ids.at(-1)).toBe(49407n);
  });

  test('truncates content while retaining the terminal token', () => {
    const ids = ClipTokenizer.fromJson(PINNED_TOKENIZER).encode(
      Array.from({ length: 100 }, () => 'a').join(' '),
    );

    expect(ids[0]).toBe(49406n);
    expect(ids.at(-1)).toBe(49407n);
    expect(ids.filter((id) => id === 320n)).toHaveLength(75);
  });

  test('rejects a tokenizer with incompatible special-token IDs', () => {
    const invalid = JSON.stringify({
      model: {
        vocab: { '<|startoftext|>': 1, '<|endoftext|>': 2 },
        merges: [],
      },
    });

    expect(() => ClipTokenizer.fromJson(invalid)).toThrow('special token');
  });
});
