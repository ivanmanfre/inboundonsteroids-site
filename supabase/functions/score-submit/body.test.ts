import { readCapped } from './body.ts';

const post = (body: string) => new Request('https://x.test/', { method: 'POST', body });

Deno.test('readCapped returns the bytes of a body within the cap', async () => {
  const b = await readCapped(post('{"a":1}'), 4096);
  if (!b || new TextDecoder().decode(b) !== '{"a":1}') throw Error('wrong body');
});

Deno.test('readCapped refuses a body over the cap, with or without a content-length header', async () => {
  if (await readCapped(post('x'.repeat(4097)), 4096) !== null) throw Error('oversized body accepted');
  const stream = new ReadableStream({ start(c) { c.enqueue(new Uint8Array(3000)); c.enqueue(new Uint8Array(3000)); c.close(); } });
  const chunked = new Request('https://x.test/', { method: 'POST', body: stream, duplex: 'half' } as RequestInit);
  if (await readCapped(chunked, 4096) !== null) throw Error('streamed oversize accepted');
  if (await readCapped(post('x'.repeat(4096)), 4096) === null) throw Error('exact-cap body refused');
});
