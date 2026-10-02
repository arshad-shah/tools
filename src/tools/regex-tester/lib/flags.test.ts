import { describe, expect, it } from 'vitest';
import { DEFAULT_FLAGS, FLAG_INFO, flagsString } from './flags';

describe('flagsString', () => {
  it('is "g" for the defaults', () => {
    expect(flagsString(DEFAULT_FLAGS)).toBe('g');
  });

  it('is empty when every flag is off', () => {
    expect(flagsString({ ...DEFAULT_FLAGS, global: false })).toBe('');
  });

  it('lists every flag in FLAG_INFO order', () => {
    const all = Object.fromEntries(
      FLAG_INFO.map((f) => [f.key, true]),
    ) as unknown as typeof DEFAULT_FLAGS;
    expect(flagsString(all)).toBe('gimsuyd');
  });

  it('keeps order regardless of which flags are set', () => {
    expect(
      flagsString({
        ...DEFAULT_FLAGS,
        global: false,
        hasIndices: true,
        ignoreCase: true,
      }),
    ).toBe('id');
  });
});
