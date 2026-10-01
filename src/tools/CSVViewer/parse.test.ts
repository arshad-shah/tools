import { describe, expect, it } from 'vitest';
import { delimiterFor, parseDelimited } from './parse';

describe('csv parse', () => {
  it('picks the delimiter from the extension', () => {
    expect(delimiterFor('a.tsv')).toBe('\t');
    expect(delimiterFor('A.TSV')).toBe('\t');
    expect(delimiterFor('a.csv')).toBe(',');
    expect(delimiterFor('noext')).toBe(',');
  });
  it('parses headers with dynamic typing and skips empty lines', () => {
    expect(parseDelimited('name,age\nAda,36\n\nBob,7\n', ',')).toEqual({
      columns: ['name', 'age'],
      data: [
        { name: 'Ada', age: 36 },
        { name: 'Bob', age: 7 },
      ],
    });
  });
  it('parses TSV', () => {
    expect(parseDelimited('a\tb\n1\t2', '\t').data).toEqual([{ a: 1, b: 2 }]);
  });
  it('reports the first Papa error as INVALID_INPUT', () => {
    expect(() => parseDelimited('a,b\n"1,2', ',')).toThrow(
      expect.objectContaining({
        code: 'INVALID_INPUT',
        message: expect.stringMatching(/^Parsing error: /),
      }),
    );
  });
});
