import { describe, expect, it } from 'vitest';
import { searchQuality } from './target-size';

/** A monotone size curve: 10 KB at quality 0 up to 210 KB at quality 1. */
const sizeAt = (q: number) => Math.round(10_000 + 200_000 * q);

describe('searchQuality', () => {
  it('finds the largest quality under the target within 8 encodes', async () => {
    let calls = 0;
    const encodeAt = (q: number) => {
      calls++;
      return Promise.resolve(sizeAt(q));
    };
    const r = await searchQuality(encodeAt, 100_000);
    expect(r.met).toBe(true);
    expect(r.bytes).toBeLessThanOrEqual(100_000);
    // The true answer is q = 0.45; bisection over [0.3, 0.95] lands within 0.02.
    expect(r.quality).toBeGreaterThan(0.43);
    expect(r.quality).toBeLessThanOrEqual(0.45);
    expect(calls).toBeLessThanOrEqual(8);
  });

  it('returns the maximum quality at once when it already fits', async () => {
    let calls = 0;
    const r = await searchQuality((q) => {
      calls++;
      return Promise.resolve(sizeAt(q));
    }, 1_000_000);
    expect(r).toEqual({ quality: 0.95, bytes: sizeAt(0.95), met: true });
    expect(calls).toBe(1);
  });

  it('reports an impossible target as not met at the minimum quality', async () => {
    const r = await searchQuality((q) => Promise.resolve(sizeAt(q)), 1_000);
    expect(r).toEqual({ quality: 0.3, bytes: sizeAt(0.3), met: false });
  });

  it('honours custom bounds and iteration limits', async () => {
    let calls = 0;
    const r = await searchQuality(
      (q) => {
        calls++;
        return Promise.resolve(sizeAt(q));
      },
      100_000,
      { min: 0.1, max: 0.9, maxIter: 4 },
    );
    expect(calls).toBe(4);
    expect(r.met).toBe(true);
    expect(r.quality).toBeGreaterThanOrEqual(0.1);
    expect(r.bytes).toBeLessThanOrEqual(100_000);
  });
});
