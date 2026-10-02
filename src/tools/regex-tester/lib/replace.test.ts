import { describe, expect, it } from 'vitest';
import { replaceText, splitText } from './replace';

const smile = String.fromCodePoint(0x1f600);

// [pattern, flags, text, replacement]
const CASES: [string, string, string, string][] = [
  ['a', 'g', 'banana', 'o'],
  ['a', '', 'banana', 'o'],
  ['(\\w+)@(\\w+)', 'g', 'me@home you@work', '$2 at $1'],
  ['(\\w+)', 'g', 'one two', '[$1]'],
  ['(\\w+)', 'g', 'one two', '$&-$&'],
  ['o', 'g', 'foo', '$$'],
  ['o', '', 'xoy', '<$`>'],
  ['o', '', 'xoy', "<$'>"],
  ['b', 'g', 'abc', "$`|$'"],
  ['(a)', 'g', 'aa', '$0'],
  ['(a)', 'g', 'aa', '$00'],
  ['(a)', 'g', 'aa', '$10'],
  ['(a)(b)(c)(d)(e)(f)(g)(h)(i)(j)', '', 'abcdefghij', '$10$1'],
  ['(a)(b)(c)(d)(e)(f)(g)(h)(i)(j)', '', 'abcdefghij', '$11'],
  ['(a)', 'g', 'aa', '$2'],
  ['(a)|(b)', 'g', 'ab', '[$1|$2]'],
  ['(?<y>\\d{4})-(?<m>\\d{2})', 'g', '2024-05 1999-12', '$<m>/$<y>'],
  ['(?<y>\\d{4})', 'g', '2024', '$<nope>!'],
  ['(\\d{4})', 'g', '2024', '$<y>'],
  ['(?<y>\\d{4})', 'g', '2024', '$<y'],
  ['x*', 'g', 'abc', '-'],
  ['', 'g', 'abc', '_'],
  ['', 'gu', `a${smile}b`, '_'],
  ['', 'g', `a${smile}b`, '_'],
  ['^', 'gm', 'one\ntwo', '> '],
  ['a', 'gi', 'AaA', 'b'],
  ['a', 'y', 'aab', 'x'],
  ['a', 'gy', 'aaba', 'x'],
  ['\\s+', 'g', 'a  b\t\tc', ' '],
  ['$', 'g', 'end', '$'],
  ['(o)', 'g', 'foo', '$'],
  ['(o)', 'g', 'foo', '$1$'],
];

describe('replaceText', () => {
  it.each(CASES)(
    'matches the native replace for /%s/%s',
    (pattern, flags, text, replacement) => {
      const native = text.replace(new RegExp(pattern, flags), replacement);
      expect(replaceText(pattern, flags, text, replacement).output).toBe(
        native,
      );
    },
  );

  it('counts replacements', () => {
    expect(replaceText('a', 'g', 'banana', 'o').count).toBe(3);
    expect(replaceText('a', '', 'banana', 'o').count).toBe(1);
    expect(replaceText('z', 'g', 'banana', 'o').count).toBe(0);
  });

  it('gives an empty string for a missing named group, like native', () => {
    expect(replaceText('(?<a>x)', 'g', 'x', '[$<b>]').output).toBe('[]');
  });

  it('reports a syntax error as INVALID_INPUT', () => {
    expect(() => replaceText('(', 'g', 'x', '')).toThrow(
      expect.objectContaining({ code: 'INVALID_INPUT' }),
    );
  });
});

describe('splitText', () => {
  it('splits like the native split, captures included', () => {
    expect(splitText(',\\s*', 'g', 'a, b,c')).toEqual(['a', 'b', 'c']);
    expect(splitText('(-)', '', 'a-b')).toEqual(['a', '-', 'b']);
  });
  it('respects the limit', () => {
    expect(splitText(',', '', 'a,b,c,d', 2)).toEqual(['a', 'b']);
  });
});
