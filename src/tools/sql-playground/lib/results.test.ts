import { describe, expect, it } from 'vitest';
import {
  blobHex,
  displayValue,
  formatMs,
  plural,
  resultToCsv,
  resultToJson,
} from './results';

const r = {
  columns: ['id', 'name', 'id', 'data'],
  rows: [
    [1, 'a, "b"', 2, new Uint8Array([0, 171])],
    [2, null, 3, null],
  ],
};

describe('results', () => {
  it('writes CSV with unique headers, quoting, NULL as empty and blobs as hex', () => {
    expect(resultToCsv(r)).toBe(
      'id,name,id_2,data\n1,"a, ""b""",2,X\'00ab\'\n2,,3,\n',
    );
  });

  it('writes JSON records', () => {
    expect(JSON.parse(resultToJson(r))).toEqual([
      { id: 1, name: 'a, "b"', id_2: 2, data: "X'00ab'" },
      { id: 2, name: null, id_2: 3, data: null },
    ]);
  });

  it('shows values for the grid', () => {
    expect(displayValue(null)).toBe('NULL');
    expect(displayValue(new Uint8Array(1200))).toBe('BLOB, 1,200 bytes');
    expect(displayValue(1.5)).toBe('1.5');
    expect(blobHex(new Uint8Array([1, 255]))).toBe('01ff');
  });

  it('formats counts and times', () => {
    expect(plural(1, 'row')).toBe('1 row');
    expect(plural(2000, 'row')).toBe('2,000 rows');
    expect(formatMs(0.25)).toBe('0.3 ms');
    expect(formatMs(12.4)).toBe('12 ms');
    expect(formatMs(1250)).toBe('1.25 s');
  });
});
