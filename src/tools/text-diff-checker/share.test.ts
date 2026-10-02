import { describe, expect, it } from 'vitest';
import { parseDiffShare } from './share';

const valid = {
  v: 1,
  left: 'a',
  right: 'b',
  opts: {
    granularity: 'word',
    mode: 'text',
    ignoreWhitespace: false,
    ignoreCase: true,
    ignoreBlankLines: false,
    trimTrailing: false,
    sortKeys: false,
  },
};

describe('parseDiffShare', () => {
  it('accepts a valid state', () => {
    expect(parseDiffShare(valid)).toEqual(valid);
  });
  it('rejects other versions and shapes', () => {
    expect(parseDiffShare({ ...valid, v: 2 })).toBeNull();
    expect(parseDiffShare({ ...valid, left: 1 })).toBeNull();
    expect(parseDiffShare({ ...valid, opts: null })).toBeNull();
    expect(
      parseDiffShare({ ...valid, opts: { ...valid.opts, granularity: 'x' } }),
    ).toBeNull();
    expect(
      parseDiffShare({ ...valid, opts: { ...valid.opts, ignoreCase: 'yes' } }),
    ).toBeNull();
    expect(parseDiffShare('nope')).toBeNull();
  });
});
