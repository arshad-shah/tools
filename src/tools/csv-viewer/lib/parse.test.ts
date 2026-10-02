import { describe, expect, it } from 'vitest';
import { coerceCell, detectDelimiter, parseDelimited } from './parse';

describe('coerceCell', () => {
  it('keeps values that typing would change as text', () => {
    expect(coerceCell('00123')).toBe('00123');
    expect(coerceCell('12345678901234567')).toBe('12345678901234567');
    expect(coerceCell('2024-01-05')).toBe('2024-01-05');
    expect(coerceCell('1,50')).toBe('1,50');
    expect(coerceCell(' 7')).toBe(' 7');
  });

  it('types safe numbers, booleans and empty cells', () => {
    expect(coerceCell('42')).toBe(42);
    expect(coerceCell('-0.5')).toBe(-0.5);
    expect(coerceCell('1e3')).toBe(1000);
    expect(coerceCell('0')).toBe(0);
    expect(coerceCell('0.25')).toBe(0.25);
    expect(coerceCell('true')).toBe(true);
    expect(coerceCell('FALSE')).toBe(false);
    expect(coerceCell('')).toBeNull();
  });
});

describe('detectDelimiter', () => {
  it.each([
    ['a,b,c\n1,2,3', ','],
    ['a;b;c\n1;2;3', ';'],
    ['x;y\n1,5;2,5\n3,0;4,1', ';'],
    ['a\tb\n1\t2', '\t'],
    ['a|b\n1|2', '|'],
    ['a,b\n"x;y;z",2', ','],
    ['a;b;c', ';'],
    ['name\nAda', ','],
  ])('%j uses %j', (text, expected) => {
    expect(detectDelimiter(text)).toBe(expected);
  });
});

describe('parseDelimited', () => {
  it('parses headers, types safe values and skips empty lines', () => {
    const r = parseDelimited('name,age\nAda,36\n\nBob,7\n', 'auto');
    expect(r.columns).toEqual(['name', 'age']);
    expect(r.data).toEqual([
      { name: 'Ada', age: 36 },
      { name: 'Bob', age: 7 },
    ]);
    expect(r.warnings).toEqual([]);
  });

  it('keeps leading zeros, long IDs and dates exact', () => {
    const r = parseDelimited(
      'zip,id,day\n00123,12345678901234567,2024-01-05',
      'auto',
    );
    expect(r.data[0]).toEqual({
      zip: '00123',
      id: '12345678901234567',
      day: '2024-01-05',
    });
  });

  it.each([
    [',', 'a,b\n1,2\n3,4'],
    [';', 'a;b\n1,5;2\n3;4'],
    ['\t', 'a\tb\n1\t2\n3\t4'],
    ['|', 'a|b\n1|2\n3|4'],
  ])('auto-detects the %j delimiter', (delimiter, text) => {
    const r = parseDelimited(text, 'auto');
    expect(r.delimiter).toBe(delimiter);
    expect(r.columns).toEqual(['a', 'b']);
    expect(r.data).toHaveLength(2);
  });

  it('detects semicolons in European CSV with decimal commas', () => {
    const r = parseDelimited('name;price\nTea;1,50\nCake;2,75', 'auto');
    expect(r.delimiter).toBe(';');
    expect(r.data[0]).toEqual({ name: 'Tea', price: '1,50' });
  });

  it('honours a manual delimiter over detection', () => {
    const r = parseDelimited('a;b,c\n1;2,3', ',');
    expect(r.delimiter).toBe(',');
    expect(r.columns).toEqual(['a;b', 'c']);
  });

  it('keeps ragged rows (padded or cut) and lists them', () => {
    const r = parseDelimited('a,b\n1,2\n3\n4,5\n6,7,8\n9,10', 'auto');
    expect(r.data).toEqual([
      { a: 1, b: 2 },
      { a: 3, b: null },
      { a: 4, b: 5 },
      { a: 6, b: 7 },
      { a: 9, b: 10 },
    ]);
    expect(r.warnings.map((w) => w.row)).toEqual([2, 4]);
    expect(r.warnings[0].message).toMatch(/few/i);
    expect(r.warnings[1].message).toMatch(/many/i);
  });

  it('keeps a row that is missing its trailing empty cell', () => {
    const r = parseDelimited('a,b,c\n1,2', 'auto');
    expect(r.data).toEqual([{ a: 1, b: 2, c: null }]);
    expect(r.warnings).toHaveLength(1);
  });

  it('explains an unterminated quote on the row where it starts', () => {
    const r = parseDelimited('a,b\n1,2\n"3,4\n5,6', ',');
    expect(r.data).toHaveLength(2);
    expect(r.warnings).toEqual([
      {
        row: 2,
        message:
          'Unterminated quote from row 2; the rest of the file was read as one cell',
      },
    ]);
  });

  it('shows the columns of a header-only file with no rows', () => {
    const r = parseDelimited('a;b;c\n', 'auto');
    expect(r.columns).toEqual(['a', 'b', 'c']);
    expect(r.data).toEqual([]);
  });

  it('accepts an empty file and fails only when nothing can be read', () => {
    expect(parseDelimited('', 'auto').data).toEqual([]);
    expect(() => parseDelimited('"', ',')).toThrow(
      expect.objectContaining({ code: 'INVALID_INPUT' }),
    );
  });
});

describe('parseDelimited options', () => {
  it('names columns Column 1..n without a header row', () => {
    const r = parseDelimited('a,b,c\n1,2,3', ',', { header: false });
    expect(r.columns).toEqual(['Column 1', 'Column 2', 'Column 3']);
    expect(r.data).toEqual([
      { 'Column 1': 'a', 'Column 2': 'b', 'Column 3': 'c' },
      { 'Column 1': 1, 'Column 2': 2, 'Column 3': 3 },
    ]);
  });

  it('pads short rows to the widest row without a header', () => {
    const r = parseDelimited('1\n2,3', ',', { header: false });
    expect(r.columns).toEqual(['Column 1', 'Column 2']);
    expect(r.data[0]).toEqual({ 'Column 1': 1, 'Column 2': null });
  });

  it('keeps keep-as-text columns exactly as written', () => {
    const r = parseDelimited('id,amount\n1,42', ',', {
      keepText: new Set(['amount']),
    });
    expect(r.data[0]).toEqual({ id: 1, amount: '42' });
  });

  it('honours a custom quote character', () => {
    const r = parseDelimited("a,b\n'x,y',2", ',', { quoteChar: "'" });
    expect(r.data[0]).toEqual({ a: 'x,y', b: 2 });
  });

  it('renames repeated header names', () => {
    const r = parseDelimited('a,a\n1,2', ',');
    expect(r.columns).toEqual(['a', 'a_1']);
  });

  it('reports progress up to the full length', () => {
    const text = 'a,b\n1,2\n3,4';
    const seen: [number, number][] = [];
    parseDelimited(text, ',', { onProgress: (d, t) => seen.push([d, t]) });
    expect(seen.at(-1)).toEqual([text.length, text.length]);
  });
});
