import { describe, expect, it } from 'vitest';
import { digest } from '@/shared/lib/crypto/digest';
import type { JobProgress } from '@/shared/state/useJob';
import handlers from './hash';

const hashFile = handlers['hash.file'];

function ctx(signal = new AbortController().signal) {
  const seen: JobProgress[] = [];
  return { seen, ctx: { signal, progress: (p: JobProgress) => seen.push(p) } };
}

function bigBytes(n: number): Uint8Array<ArrayBuffer> {
  const b = new Uint8Array(n);
  for (let i = 0; i < n; i++) b[i] = (i * 31 + (i >>> 8)) & 0xff;
  return b;
}

describe('hash.file', () => {
  it('matches a one-shot digest over 20 MB in chunks', async () => {
    const bytes = bigBytes(20 * 1024 * 1024 + 123);
    const { ctx: c, seen } = ctx();
    const out = await hashFile(c, new Blob([bytes]), [
      'sha256',
      'blake3',
      'crc32',
    ]);
    for (const id of ['sha256', 'blake3', 'crc32'] as const)
      expect(out[id]).toBe(await digest(id, bytes));
    const done = seen.map((p) => p.done);
    expect(done).toEqual([...done].sort((a, b) => a - b));
    expect(seen.at(-1)).toEqual({ done: bytes.length, total: bytes.length });
    expect(seen.length).toBeGreaterThan(5);
  }, 60_000);

  it('rejects CANCELLED when aborted', async () => {
    const ac = new AbortController();
    const { ctx: c } = ctx(ac.signal);
    const p = hashFile(c, new Blob([bigBytes(9 * 1024 * 1024)]), ['sha256']);
    ac.abort();
    await expect(p).rejects.toMatchObject({ code: 'CANCELLED' });
  });

  it('hashes an empty file', async () => {
    const { ctx: c } = ctx();
    const out = await hashFile(c, new Blob([]), ['md5']);
    expect(out.md5).toBe('d41d8cd98f00b204e9800998ecf8427e');
  });
});

describe('crypto.seal and crypto.open', () => {
  const seal = handlers['crypto.seal'];
  const open = handlers['crypto.open'];
  const plain = () => new TextEncoder().encode('attack at dawn');
  const pass = ['correct', 'horse'].join(' ');

  it('round-trips through the envelope', async () => {
    const { ctx: c, seen } = ctx();
    const sealed = await seal(c, plain(), pass, {
      kind: 'pbkdf2',
      iterations: 600_000,
    });
    expect(seen.at(-1)).toEqual({ done: 1, total: 1 });
    const back = await open(ctx().ctx, sealed.value, pass);
    expect(new TextDecoder().decode(back.value)).toBe('attack at dawn');
    expect(back.transfer).toEqual([back.value.buffer]);
  });

  it('rejects a wrong passphrase with WRONG_PASSWORD', async () => {
    const sealed = await seal(ctx().ctx, plain(), pass, {
      kind: 'pbkdf2',
      iterations: 600_000,
    });
    await expect(open(ctx().ctx, sealed.value, 'nope')).rejects.toMatchObject({
      code: 'WRONG_PASSWORD',
    });
  });
});
