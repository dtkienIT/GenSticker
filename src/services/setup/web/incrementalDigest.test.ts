import { describe, expect, it, vi } from 'vitest';
import { createDigestingStream } from './incrementalDigest';

describe('createDigestingStream', () => {
  it('hashes bytes while forwarding the same stream', async () => {
    const onChunk = vi.fn();
    const source = new Response('hello').body;
    if (!source) throw new Error('ReadableStream is unavailable');

    const digesting = createDigestingStream(source, { onChunk });
    const forwarded = await new Response(digesting.stream).text();

    expect(forwarded).toBe('hello');
    await expect(digesting.result).resolves.toEqual({
      bytes: 5,
      sha256: '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
    });
    expect(onChunk).toHaveBeenCalledWith(5);
  });

  it('rejects consumption after cancellation', async () => {
    const controller = new AbortController();
    const source = new Response('cancel me').body;
    if (!source) throw new Error('ReadableStream is unavailable');
    controller.abort();

    const digesting = createDigestingStream(source, { signal: controller.signal });

    await expect(new Response(digesting.stream).arrayBuffer()).rejects.toThrow(
      'Model installation cancelled',
    );
    await expect(digesting.result).rejects.toThrow('Model installation cancelled');
  });
});
