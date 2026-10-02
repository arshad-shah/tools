import { describe, expect, it, vi } from 'vitest';
import { pick, randomBytes, randomInt, randomString, shuffle } from './random';

describe('randomInt', () => {
  it('stays in range and is close to uniform', () => {
    const counts = [0, 0, 0];
    for (let i = 0; i < 30_000; i++) counts[randomInt(3)]++;
    for (const c of counts) {
      expect(c / 30_000).toBeGreaterThan(0.3);
      expect(c / 30_000).toBeLessThan(0.37);
    }
  });
  it('handles the edges', () => {
    expect(randomInt(1)).toBe(0);
    expect(() => randomInt(0)).toThrow();
    expect(() => randomInt(1.5)).toThrow();
    expect(() => randomInt(2 ** 32 + 1)).toThrow();
    const v = randomInt(2 ** 32);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(2 ** 32);
  });
  it('rejects draws above the largest multiple of the range', () => {
    const draws = [0xffffffff, 5];
    vi.spyOn(crypto, 'getRandomValues').mockImplementation(
      <T extends ArrayBufferView | null>(arr: T): T => {
        (arr as unknown as Uint32Array)[0] = draws.shift() ?? 0;
        return arr;
      },
    );
    expect(randomInt(10)).toBe(5);
    expect(draws).toHaveLength(0);
  });
});

describe('random helpers', () => {
  it('randomBytes returns n bytes', () => {
    expect(randomBytes(16)).toHaveLength(16);
    expect(randomBytes(70_000)).toHaveLength(70_000);
  });
  it('shuffle returns a permutation and leaves the input alone', () => {
    const input = Array.from({ length: 50 }, (_, i) => i);
    const out = shuffle(input);
    expect(out).not.toBe(input);
    expect([...out].sort((a, b) => a - b)).toEqual(input);
    expect(input[0]).toBe(0);
  });
  it('pick takes an element and refuses an empty list', () => {
    expect(['a', 'b']).toContain(pick(['a', 'b']));
    expect(() => pick([])).toThrow();
  });
  it('randomString uses only the alphabet', () => {
    expect(randomString('ab', 16)).toMatch(/^[ab]{16}$/);
    expect(randomString('ab', 0)).toBe('');
    expect(() => randomString('', 3)).toThrow();
  });
});
