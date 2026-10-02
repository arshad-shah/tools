import { describe, expect, it } from 'vitest';
import { readInstant } from './read';

const opts = { zone: 'UTC', now: 0 };

describe('readInstant', () => {
  it('detects Unix milliseconds by magnitude', () => {
    expect(readInstant('1700000000000', 'auto', opts)).toEqual({
      epochMs: 1700000000000,
      detected: 'unix-ms',
    });
  });
  it('reads a number in the chosen unit', () => {
    expect(readInstant('1700000000000', 'unix-us', opts).epochMs).toBe(
      1700000000,
    );
    expect(readInstant('1700000000', 'unix-s', opts)).toEqual({
      epochMs: 1700000000000,
      detected: 'unix-s',
    });
  });
  it('still reads dates with an override', () => {
    expect(readInstant('2023-11-14T22:13:20Z', 'unix-s', opts).detected).toBe(
      'iso',
    );
  });
  it('refuses out-of-range numbers', () => {
    expect(() => readInstant('9'.repeat(20), 'unix-s', opts)).toThrow(
      /out of range/,
    );
  });
});
