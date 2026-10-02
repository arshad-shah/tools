import { describe, expect, it } from 'vitest';
import { createPrng, cryptoRng, fnv1a32 } from './prng';

const first = (seed: string, n = 5) => {
  const r = createPrng(seed);
  return Array.from({ length: n }, () => r.next());
};

describe('createPrng', () => {
  it('gives the same first numbers for a seed on every run', () => {
    expect(first('abc')).toEqual(first('abc'));
    expect(first('abc')).toMatchInlineSnapshot(`
      [
        0.04897335614077747,
        0.8727829298004508,
        0.8606525850482285,
        0.5241031649056822,
        0.6873862475622445,
      ]
    `);
  });

  it('differs for a different seed', () => {
    expect(first('abd')).not.toEqual(first('abc'));
  });

  it('draws unbiased integers in range', () => {
    const r = createPrng('ints');
    const counts = new Array(6).fill(0);
    for (let i = 0; i < 60_000; i++) counts[r.int(6)]++;
    for (const c of counts) expect(Math.abs(c - 10_000)).toBeLessThan(500);
  });

  it('floats stay in [0, 1)', () => {
    const r = createPrng('floats');
    for (let i = 0; i < 10_000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('picks from a list and refuses an empty one', () => {
    const r = createPrng('pick');
    expect(['a', 'b']).toContain(r.pick(['a', 'b']));
    expect(() => r.pick([])).toThrow(RangeError);
    expect(() => r.int(0)).toThrow(RangeError);
  });

  it('makes deterministic bytes of any length', () => {
    expect(createPrng('b').bytes(7)).toEqual(createPrng('b').bytes(7));
    expect(createPrng('b').bytes(7)).toHaveLength(7);
  });

  it('hashes seeds with FNV-1a', () => {
    expect(fnv1a32('')).toBe(0x811c9dc5);
    expect(fnv1a32('a')).toBe(0xe40c292c);
  });
});

describe('cryptoRng', () => {
  it('has the same interface', () => {
    const r = cryptoRng();
    expect(r.int(10)).toBeLessThan(10);
    expect(r.next()).toBeLessThan(1);
    expect(r.bytes(5)).toHaveLength(5);
    expect([1, 2, 3]).toContain(r.pick([1, 2, 3]));
  });
});
