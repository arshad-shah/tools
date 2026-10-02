import { describe, expect, it } from 'vitest';
import { matchingLines } from './search';

describe('matchingLines', () => {
  it('returns [] for an empty term', () => {
    expect(matchingLines('a\nb', '')).toEqual([]);
  });

  it('returns the 1-based lines containing the term, case-insensitively', () => {
    expect(matchingLines('Foo\nbar\nfoo bar\n', 'FOO')).toEqual([1, 3]);
  });

  it('treats regex-special characters literally', () => {
    expect(matchingLines('f(x)\n[1]\n.*', '(')).toEqual([1]);
    expect(matchingLines('f(x)\n[1]\n.*', '.*')).toEqual([3]);
  });
});
