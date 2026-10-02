import { describe, expect, it } from 'vitest';
import { flattenObject, toCsv } from './csv-write';

describe('toCsv', () => {
  it('quotes fields with delimiters, quotes and newlines (RFC 4180)', () => {
    const csv = toCsv([
      { a: 'plain', b: 'x,y', c: 'say "hi"' },
      { a: 'two\nlines', b: null, c: 3 },
    ]);
    expect(csv).toBe('a,b,c\nplain,"x,y","say ""hi"""\n"two\nlines",,3\n');
  });
  it('honours delimiter, columns, header and CRLF', () => {
    expect(
      toCsv([{ a: 1, b: 'p;q', c: { z: 1 } }], {
        delimiter: ';',
        columns: ['c', 'b'],
        header: false,
        crlf: true,
      }),
    ).toBe('"{""z"":1}";"p;q"\r\n');
    expect(toCsv([])).toBe('');
  });
  it('collects columns from every row', () => {
    expect(toCsv([{ a: 1 }, { b: 2 }])).toBe('a,b\n1,\n,2\n');
  });
});

describe('flattenObject', () => {
  it('flattens nested objects and arrays', () => {
    expect(
      flattenObject({ a: { b: 1, c: [2, { d: 3 }] }, e: {}, f: null }),
    ).toEqual({ 'a.b': 1, 'a.c.0': 2, 'a.c.1.d': 3, e: {}, f: null });
    expect(flattenObject({ a: { b: 1 } }, '/')).toEqual({ 'a/b': 1 });
  });
});
