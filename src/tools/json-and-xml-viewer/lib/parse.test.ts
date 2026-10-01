import { describe, expect, it } from 'vitest';
import { ToolError } from '@/shared/lib/errors';
import {
  describeJsonError,
  findJsonErrorOffset,
  locate,
  matchesSearch,
  parseJson,
  xmlErrorLocation,
} from './parse';

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

  const message = (text: string) => {
    try {
      parseJson(text);
    } catch (e) {
      return (e as ToolError).message;
    }
    throw new Error('expected a parse error');
  };

  it('locates errors the engine reports without a position', () => {
    // V8: "Unexpected token 'x', "{"a": x}" is not valid JSON" (no offset).
    expect(message('{"a": x}')).toMatch(/^Line 1, column 7: /);
    expect(message('{\n "a": tru\n}')).toMatch(/^Line 2, column 10: /);
  });

  it('never echoes the document back in the message', () => {
    const doc = `{"a": x, "secret": "${'s'.repeat(500)}"}`;
    const m = message(doc);
    expect(m).not.toContain('secret');
    expect(m).not.toMatch(/is not valid JSON/);
    expect(m).toBe("Line 1, column 7: Unexpected token 'x'");
  });
});

describe('describeJsonError', () => {
  it('reads the Firefox wording', () => {
    expect(
      describeJsonError(
        '{"a": x}',
        'JSON.parse: unexpected character at line 1 column 7 of the JSON data',
      ),
    ).toEqual({ line: 1, column: 7, message: 'unexpected character' });
  });

  it('reads the V8 "(line N column M)" suffix', () => {
    expect(
      describeJsonError(
        '{"a":1,}',
        'Expected double-quoted property name in JSON at position 7 (line 1 column 8)',
      ),
    ).toEqual({
      line: 1,
      column: 8,
      message: 'Expected double-quoted property name',
    });
  });

  it('falls back to its own scan for Safari-style messages', () => {
    expect(
      describeJsonError('[1,\n 2,, 3]', 'JSON Parse error: Unexpected comma'),
    ).toEqual({ line: 2, column: 4, message: 'Unexpected comma' });
  });

  it('omits the location rather than inventing one', () => {
    expect(describeJsonError('{"a":1}', 'Something odd')).toEqual({
      message: 'Something odd',
    });
  });
});

describe('findJsonErrorOffset', () => {
  it.each([
    ['{"a": x}', 6],
    ['[1,2', 4],
    ['{"a":1,}', 7],
    ['{"a":1} x', 8],
    ['"abc', 4],
    ['', 0],
    ['{"a" 1}', 5],
    ['[1, 2, 3]', null],
    ['{"a": [true, false, null, -1.5e3, "x\\u0041"]}', null],
  ])('%j fails at %j', (text, offset) => {
    expect(findJsonErrorOffset(text)).toBe(offset);
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
