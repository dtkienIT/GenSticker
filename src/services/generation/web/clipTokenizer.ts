const MAX_LENGTH = 77;
const START_TOKEN = 49406n;
const END_TOKEN = 49407n;
const TOKEN_PATTERN =
  /<\|startoftext\|>|<\|endoftext\|>|'s|'t|'re|'ve|'m|'ll|'d|[\p{L}]+|[\p{N}]|[^\s\p{L}\p{N}]+/gu;

interface TokenizerJson {
  model?: {
    vocab?: Record<string, number>;
    merges?: [string, string][];
  };
}

export class ClipTokenizer {
  private static readonly byteEncoder = buildByteEncoder();

  private constructor(
    private readonly vocab: ReadonlyMap<string, bigint>,
    private readonly mergeRanks: ReadonlyMap<string, number>,
  ) {}

  static fromJson(json: string): ClipTokenizer {
    const parsed = JSON.parse(json) as TokenizerJson;
    const vocab = new Map(
      Object.entries(parsed.model?.vocab ?? {}).map(([token, id]) => [token, BigInt(id)]),
    );
    if (vocab.get('<|startoftext|>') !== START_TOKEN || vocab.get('<|endoftext|>') !== END_TOKEN) {
      throw new Error('CLIP tokenizer special token IDs are incompatible');
    }
    const mergeRanks = new Map(
      (parsed.model?.merges ?? []).map(([left, right], rank) => [
        ClipTokenizer.mergeKey(left, right),
        rank,
      ]),
    );
    return new ClipTokenizer(vocab, mergeRanks);
  }

  encode(text: string): bigint[] {
    const content: bigint[] = [];
    for (const match of normalize(text).matchAll(TOKEN_PATTERN)) {
      for (const token of this.bpe(this.byteEncode(match[0]))) {
        content.push(this.vocab.get(token) ?? END_TOKEN);
        if (content.length === MAX_LENGTH - 2) break;
      }
      if (content.length === MAX_LENGTH - 2) break;
    }

    const output = Array<bigint>(MAX_LENGTH).fill(END_TOKEN);
    output[0] = START_TOKEN;
    content.forEach((token, index) => {
      output[index + 1] = token;
    });
    output[content.length + 1] = END_TOKEN;
    return output;
  }

  private bpe(token: string): string[] {
    if (!token) return [];
    const pieces = Array.from(token).map(
      (character, index, characters) => character + (index === characters.length - 1 ? '</w>' : ''),
    );

    while (pieces.length > 1) {
      let bestIndex = -1;
      let bestRank = Number.POSITIVE_INFINITY;
      for (let index = 0; index < pieces.length - 1; index += 1) {
        const rank = this.mergeRanks.get(ClipTokenizer.mergeKey(pieces[index], pieces[index + 1]));
        if (rank !== undefined && rank < bestRank) {
          bestIndex = index;
          bestRank = rank;
        }
      }
      if (bestIndex < 0) break;
      pieces.splice(bestIndex, 2, pieces[bestIndex] + pieces[bestIndex + 1]);
    }
    return pieces;
  }

  private byteEncode(token: string): string {
    const bytes = new TextEncoder().encode(token);
    return Array.from(bytes, (byte) => ClipTokenizer.byteEncoder.get(byte) ?? '').join('');
  }

  private static mergeKey(left: string, right: string): string {
    return `${left}\u0000${right}`;
  }
}

function normalize(text: string): string {
  return text.normalize('NFC').replace(/\s+/g, ' ').trim().toLocaleLowerCase();
}

function buildByteEncoder(): ReadonlyMap<number, string> {
  const direct = [...range(33, 126), ...range(161, 172), ...range(174, 255)];
  const byteValues = [...direct];
  const characters = direct.map((value) => String.fromCodePoint(value));
  let extra = 0;
  for (let byte = 0; byte <= 255; byte += 1) {
    if (!byteValues.includes(byte)) {
      byteValues.push(byte);
      characters.push(String.fromCodePoint(256 + extra));
      extra += 1;
    }
  }
  return new Map(byteValues.map((byte, index) => [byte, characters[index]]));
}

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}
