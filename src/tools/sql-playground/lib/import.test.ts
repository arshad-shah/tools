import { describe, expect, it } from 'vitest';
import {
  detectFormat,
  inferAffinities,
  MAX_COLUMNS,
  parseDelimited,
  parseImport,
  parseJsonRecords,
} from './import';
import {
  columnNames,
  quoteIdent,
  tableNameFromFile,
  uniqueName,
} from './names';

describe('inferAffinities', () => {
  it('picks INTEGER, REAL or TEXT from every value', () => {
    expect(
      inferAffinities(
        [
          ['1', '1.5', 'x', '007', '', '1e3', '-2'],
          ['2', '2', '3', '8', null, '2', '0'],
        ],
        7,
      ),
    ).toEqual(['INTEGER', 'REAL', 'TEXT', 'TEXT', 'TEXT', 'REAL', 'INTEGER']);
  });

  it('keeps long numeric IDs as text', () => {
    expect(inferAffinities([['12345678901234567890']], 1)).toEqual(['TEXT']);
  });

  it('widens typed numbers to REAL and mixed values to TEXT', () => {
    expect(
      inferAffinities(
        [
          [1, 1],
          [2.5, 'a'],
        ],
        2,
      ),
    ).toEqual(['REAL', 'TEXT']);
  });
});

describe('parseDelimited', () => {
  it('reads a header and typed rows, empty cells as NULL', () => {
    const t = parseDelimited('\uFEFFid,name,price\n1,Pen,1.5\n2,,2\n', 'csv');
    expect(t.columns).toEqual(['id', 'name', 'price']);
    expect(t.types).toEqual(['INTEGER', 'TEXT', 'REAL']);
    expect(t.rows).toEqual([
      [1, 'Pen', 1.5],
      [2, null, 2],
    ]);
    expect(t.warnings).toEqual([]);
  });

  it('reads TSV and quoted fields', () => {
    const t = parseDelimited('a\tb\n"x\ty"\t2\n', 'tsv');
    expect(t.rows).toEqual([['x\ty', 2]]);
  });

  it('pads and cuts ragged rows, with a warning', () => {
    const t = parseDelimited('a,b\n1\n1,2,3\n', 'csv');
    expect(t.rows).toEqual([
      [1, null],
      [1, 2],
    ]);
    expect(t.warnings[0]).toMatch(/2 rows had a different number of fields/);
  });

  it('names blank and repeated headers', () => {
    expect(parseDelimited(',a,A\n1,2,3\n', 'csv').columns).toEqual([
      'column_1',
      'a',
      'A_2',
    ]);
  });

  it('refuses empty input and too many columns', () => {
    expect(() => parseDelimited('', 'csv')).toThrow(/no header row/);
    const wide = Array.from({ length: MAX_COLUMNS + 1 }, (_, i) => `c${i}`);
    expect(() => parseDelimited(wide.join(','), 'csv')).toThrow(
      /at most 2,000/,
    );
  });
});

describe('parseJsonRecords', () => {
  it('reads an array of objects, union of keys in first-seen order', () => {
    const t = parseJsonRecords(
      '[{"a":1,"b":"x"},{"b":"y","c":true,"d":{"k":1}},{"a":2.5}]',
    );
    expect(t.columns).toEqual(['a', 'b', 'c', 'd']);
    expect(t.types).toEqual(['REAL', 'TEXT', 'INTEGER', 'TEXT']);
    expect(t.rows).toEqual([
      [1, 'x', null, null],
      [null, 'y', 1, '{"k":1}'],
      [2.5, null, null, null],
    ]);
  });

  it('reads the one array inside an object', () => {
    expect(parseJsonRecords('{"items":[{"a":1}],"total":1}').rows).toEqual([
      [1],
    ]);
  });

  it('reads NDJSON', () => {
    expect(parseJsonRecords('{"a":1}\n{"a":2}\n').rows).toEqual([[1], [2]]);
  });

  it('reads an array of arrays with a header row, and scalars as one column', () => {
    expect(parseJsonRecords('[["x","y"],[1,2]]')).toMatchObject({
      columns: ['x', 'y'],
      rows: [[1, 2]],
    });
    expect(parseJsonRecords('[1,"a"]')).toMatchObject({
      columns: ['value'],
      types: ['TEXT'],
      rows: [['1'], ['a']],
    });
  });

  it('explains invalid or unsuitable JSON', () => {
    expect(() => parseJsonRecords('{oops')).toThrow(/not valid JSON/);
    expect(() => parseJsonRecords('42')).toThrow(/single value/);
    expect(() => parseJsonRecords('[]')).toThrow(/empty/);
  });
});

describe('detectFormat and parseImport', () => {
  it('goes by the extension, then the content', () => {
    expect(detectFormat('a.TSV', '')).toBe('tsv');
    expect(detectFormat('a.jsonl', '')).toBe('json');
    expect(detectFormat('pasted', ' [1]')).toBe('json');
    expect(detectFormat('pasted', 'a\tb\n1\t2')).toBe('tsv');
    expect(detectFormat('pasted', 'a,b\n')).toBe('csv');
    expect(parseImport('a\n1\n', 'csv').rows).toEqual([[1]]);
  });
});

describe('names', () => {
  it('quotes identifiers', () => {
    expect(quoteIdent('a"b')).toBe('"a""b"');
  });

  it('derives table names from file names', () => {
    expect(tableNameFromFile('Sales Report (2024).csv')).toBe(
      'sales_report_2024',
    );
    expect(tableNameFromFile('2024.csv')).toBe('t_2024');
    expect(tableNameFromFile('Café.json')).toBe('cafe');
    expect(tableNameFromFile('.csv')).toBe('data');
    expect(tableNameFromFile('sqlite_x.csv')).toBe('t_sqlite_x');
  });

  it('makes names unique', () => {
    expect(uniqueName('a', ['A', 'a_2'])).toBe('a_3');
    expect(columnNames(['x', null, 'x', ' '])).toEqual([
      'x',
      'column_2',
      'x_2',
      'column_4',
    ]);
  });
});
