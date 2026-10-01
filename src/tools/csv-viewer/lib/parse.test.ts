import { describe, expect, it } from 'vitest';
import { parseDelimited } from './parse';

describe('csv parse', () => {
  it('parses headers with dynamic typing and skips empty lines', () => {
    const r = parseDelimited('name,age\nAda,36\n\nBob,7\n', 'auto');
    expect(r.columns).toEqual(['name', 'age']);
    expect(r.data).toEqual([
      { name: 'Ada', age: 36 },
      { name: 'Bob', age: 7 },
    ]);
    expect(r.warnings).toEqual([]);
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

  it('detects the delimiter despite a malformed row', () => {
    const r = parseDelimited(
      'name;price\nTea;1,50\nbroken\nCake;2,75\n',
      'auto',
    );
    expect(r.delimiter).toBe(';');
    expect(r.data.map((d) => d.name)).toEqual(['Tea', 'Cake']);
    expect(r.warnings.map((w) => w.row)).toEqual([2]);
  });

  it('falls back to comma for a single column', () => {
    expect(parseDelimited('word\nhello\nworld', 'auto').delimiter).toBe(',');
  });

  it('honours a manual delimiter over detection', () => {
    const r = parseDelimited('a;b,c\n1;2,3', ',');
    expect(r.delimiter).toBe(',');
    expect(r.columns).toEqual(['a;b', 'c']);
  });

  it('keeps valid rows and reports malformed ones with row numbers', () => {
    const r = parseDelimited('a,b\n1,2\n3\n4,5\n6,7,8\n9,10', 'auto');
    expect(r.data).toEqual([
      { a: 1, b: 2 },
      { a: 4, b: 5 },
      { a: 9, b: 10 },
    ]);
    expect(r.warnings.map((w) => w.row)).toEqual([2, 4]);
    expect(r.warnings[0].message).toMatch(/few/i);
    expect(r.warnings[1].message).toMatch(/many/i);
  });

  it('fails only when no row can be read', () => {
    expect(() => parseDelimited('a,b\n"1,2', 'auto')).toThrow(
      expect.objectContaining({ code: 'INVALID_INPUT' }),
    );
    expect(() => parseDelimited('', 'auto')).toThrow(
      expect.objectContaining({ code: 'INVALID_INPUT' }),
    );
  });
});
