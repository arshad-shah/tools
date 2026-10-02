import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FLAGS,
  FLAG_INFO,
  flagsString,
  toggleFlag,
  withIndices,
} from './flags';

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

describe('toggleFlag', () => {
  it('adds and removes a flag in canonical order', () => {
    expect(toggleFlag('g', 'i')).toBe('gi');
    expect(toggleFlag('gi', 'g')).toBe('i');
    expect(toggleFlag('mg', 'd')).toBe('dgm');
  });
  it('drops v when u is turned on, and the other way round', () => {
    expect(toggleFlag('gv', 'u')).toBe('gu');
    expect(toggleFlag('gu', 'v')).toBe('gv');
  });
  it('withIndices adds d once', () => {
    expect(withIndices('g')).toBe('dg');
    expect(withIndices('dg')).toBe('dg');
  });
});
