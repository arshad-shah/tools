import { describe, expect, it } from 'vitest';
import { toJsSnippet, toRegexLiteral } from './code';

const run = <T>(snippet: string): T =>
  new Function(`${snippet}\nreturn matches;`)() as T;

describe('toRegexLiteral', () => {
  it('escapes slashes and line terminators', () => {
    expect(toRegexLiteral('a/b\nc', 'g')).toBe('/a\\/b\\nc/g');
    expect(toRegexLiteral('a\\/b', '')).toBe('/a\\/b/');
    expect(
      toRegexLiteral('x\r' + String.fromCharCode(0x2028, 0x2029), ''),
    ).toBe('/x\\r\\u2028\\u2029/');
    expect(toRegexLiteral('', 'g')).toBe('/(?:)/g');
  });

  it('leaves a slash inside a character class alone', () => {
    expect(toRegexLiteral('[/]+', '')).toBe('/[/]+/');
    expect(toRegexLiteral('[\\]/]/', '')).toBe('/[\\]/]\\//');
  });

  it('produces a literal equivalent to new RegExp', () => {
    for (const [pattern, flags] of [
      ['a/b', 'g'],
      ['[/]+', ''],
      ['\\\\/', 'i'],
      ['line\nbreak', 'm'],
      ['\\\nx', ''],
      ['[\\]/]/', 'u'],
    ]) {
      const literal = toRegexLiteral(pattern, flags);
      const re = new Function(`return ${literal};`)() as RegExp;
      expect(re.source).toBe(new RegExp(pattern, flags).source);
      expect(re.flags).toBe(new RegExp(pattern, flags).flags);
    }
  });
});

describe('toJsSnippet', () => {
  it('produces JavaScript that runs and finds the same matches', () => {
    const text = "x a/b\n'y' a/b \\ `z` ${q}";
    const matches = run<RegExpMatchArray[]>(toJsSnippet('a/b', 'g', text));
    expect(matches.map((m) => m[0])).toEqual(['a/b', 'a/b']);
  });

  it('uses match() without the g flag', () => {
    expect(run<RegExpMatchArray>(toJsSnippet('\\d+', '', 'n=42'))[0]).toBe(
      '42',
    );
  });
});
