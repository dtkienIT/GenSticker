import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

export interface DigestStreamOptions {
  signal?: AbortSignal;
  onChunk?: (byteLength: number) => void;
}

export interface DigestResult {
  bytes: number;
  sha256: string;
}

export function createDigestingStream(
  source: ReadableStream<Uint8Array>,
  options: DigestStreamOptions = {},
): { stream: ReadableStream<Uint8Array>; result: Promise<DigestResult> } {
  const digest = sha256.create();
  let bytes = 0;
  let resolveResult!: (result: DigestResult) => void;
  let rejectResult!: (error: Error) => void;
  const result = new Promise<DigestResult>((resolve, reject) => {
    resolveResult = resolve;
    rejectResult = reject;
  });
  const cancellationError = () => new Error('Model installation cancelled');

  const stream = source.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        if (options.signal?.aborted) {
          const error = cancellationError();
          rejectResult(error);
          controller.error(error);
          return;
        }
        digest.update(chunk);
        bytes += chunk.byteLength;
        options.onChunk?.(chunk.byteLength);
        controller.enqueue(chunk);
      },
      flush() {
        if (options.signal?.aborted) {
          const error = cancellationError();
          rejectResult(error);
          throw error;
        }
        resolveResult({ bytes, sha256: bytesToHex(digest.digest()) });
      },
    }),
  );

  return { stream, result };
}
