import { describe, expect, it } from 'vitest';
import { ToolError } from '@/shared/lib/errors';
import { locate, matchesSearch, parseJson, xmlErrorLocation } from './parse';

describe('matchesSearch', () => {
  it('treats regex-special characters literally', () => {
    expect(() => matchesSearch('a(b', '(')).not.toThrow();
    expect(matchesSearch('a(b', '(')).toBe(true);
    expect(matchesSearch('a[1]', '[1]')).toBe(true);
    expect(matchesSearch('abc', '.*')).toBe(false);
    expect(matchesSearch('x+y', '+')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(matchesSearch('Hello', 'hELLo')).toBe(true);
  });
});

describe('locate', () => {
  it('turns an offset into a 1-based line and column', () => {
    expect(locate('ab\ncd', 0)).toEqual({ line: 1, column: 1 });
    expect(locate('ab\ncd', 4)).toEqual({ line: 2, column: 2 });
  });
});

describe('parseJson', () => {
  it('parses valid JSON', () => {
    expect(parseJson('{"a":[1,2]}')).toEqual({ a: [1, 2] });
  });

  it('reports the line and column of a syntax error', () => {
    const err = (() => {
      try {
        parseJson('{\n  "a": 1,\n  oops\n}');
      } catch (e) {
        return e;
      }
    })();
    expect(err).toBeInstanceOf(ToolError);
    expect((err as ToolError).message).toMatch(/^Line 3, column 3: /);
  });

  it('reports unexpected end of input at the end', () => {
    expect(() => parseJson('{\n"a": [1,')).toThrow(/^Line 2, column \d+: /);
  });
});

describe('xmlErrorLocation', () => {
  it('reads the Chromium parsererror text', () => {
    expect(
      xmlErrorLocation(
        'This page contains the following errors:error on line 3 at column 7: Opening and ending tag mismatch: b line 2 and a\nBelow is a rendering of the page up to the first error.',
      ),
    ).toEqual({
      line: 3,
      column: 7,
      message: 'Opening and ending tag mismatch: b line 2 and a',
    });
  });

  it('reads the Firefox parsererror text', () => {
    expect(
      xmlErrorLocation(
        'XML Parsing Error: mismatched tag. Expected: </b>.\nLocation: about:blank\nLine Number 4, Column 3:',
      ),
    ).toEqual({
      line: 4,
      column: 3,
      message: 'mismatched tag. Expected: </b>.',
    });
  });

  it('returns null when there is no location', () => {
    expect(xmlErrorLocation('something odd')).toBeNull();
  });
});
