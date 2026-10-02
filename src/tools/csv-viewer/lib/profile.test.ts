import { describe, expect, it } from 'vitest';
import { HyperLogLog } from './hll';
import { histogram, profileColumn, profileTable, quantile } from './profile';

describe('profileColumn', () => {
  it('profiles a numeric column with nulls and empties', () => {
    const p = profileColumn([1, 2, 3, 4, null, ''], 'integer');
    expect(p).toMatchObject({
      count: 6,
      nulls: 1,
      empties: 1,
      unique: 4,
      uniqueApprox: false,
      min: 1,
      max: 4,
      mean: 2.5,
      median: 2.5,
      p25: 1.75,
      p75: 3.25,
    });
    expect(p.histogram?.reduce((s, b) => s + b.n, 0)).toBe(4);
  });

  it('orders top values by count', () => {
    const p = profileColumn(['b', 'a', 'b', 'c', 'b', 'a'], 'text');
    expect(p.top).toEqual([
      ['b', 3],
      ['a', 2],
      ['c', 1],
    ]);
    expect(p.min).toBeUndefined();
  });

  it('gives date columns a min and max', () => {
    const p = profileColumn(['2024-03-01', '2023-12-31', '2024-01-05'], 'date');
    expect(p.min).toBe('2023-12-31');
    expect(p.max).toBe('2024-03-01');
  });

  it('estimates unique counts above 100k values within 3%', () => {
    const values = Array.from({ length: 200_000 }, (_, i) => `v${i}`);
    const p = profileColumn(values, 'text');
    expect(p.uniqueApprox).toBe(true);
    expect(Math.abs(p.unique - 200_000) / 200_000).toBeLessThan(0.03);
  });

  it('profiles a million values without a stack overflow', () => {
    const values = Array.from({ length: 1_000_000 }, (_, i) => i % 1000);
    const p = profileColumn(values, 'integer');
    expect(p.min).toBe(0);
    expect(p.max).toBe(999);
    expect(p.count).toBe(1_000_000);
    expect(p.top[0][1]).toBe(1000);
  }, 20_000);
});

describe('quantile and histogram', () => {
  it('interpolates linearly', () => {
    const s = new Float64Array([10, 20, 30]);
    expect(quantile(s, 0.5)).toBe(20);
    expect(quantile(s, 0.25)).toBe(15);
  });

  it('puts every value in a bin and spans min to max', () => {
    const s = new Float64Array(Array.from({ length: 100 }, (_, i) => i)).sort();
    const bins = histogram(s, true);
    expect(bins[0].x0).toBe(0);
    expect(bins.at(-1)!.x1).toBe(99);
    expect(bins.reduce((n, b) => n + b.n, 0)).toBe(100);
  });

  it('uses one bin for a constant column', () => {
    expect(histogram(new Float64Array([5, 5]), true)).toEqual([
      { x0: 5, x1: 5, n: 2 },
    ]);
  });
});

describe('HyperLogLog', () => {
  it('is exact-ish for small sets via linear counting', () => {
    const h = new HyperLogLog(12);
    for (let i = 0; i < 100; i++) h.add(String(i));
    expect(Math.abs(h.count() - 100)).toBeLessThanOrEqual(2);
  });
});

describe('profileTable', () => {
  it('profiles each typed column and reports progress', () => {
    const seen: number[] = [];
    const r = profileTable(
      [
        { a: 1, b: 'x' },
        { a: 2, b: 'y' },
      ],
      { a: 'integer', b: 'text' },
      (d) => seen.push(d),
    );
    expect(r.a.median).toBe(1.5);
    expect(r.b.unique).toBe(2);
    expect(seen).toEqual([1, 2]);
  });
});
