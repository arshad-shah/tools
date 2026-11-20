/** @vitest-environment jsdom */
import { strToU8, unzipSync, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { toXlsx } from '@/shared/lib/data-formats';
import { sheetTable, sheetToCsv, sheetToJson, searchRows } from './export';
import { MAX_COLUMNS, MAX_ROWS } from './sheet';
import { buildWorkbook, richWorkbook } from './build-workbook';
import { sampleWorkbook } from './sample';
import { readWorkbook } from './workbook';
import { MAX_PART_BYTES } from './zip';

describe('the sample workbook', () => {
  it('reads as an orders sheet and a hidden lookup', () => {
    const wb = readWorkbook(sampleWorkbook());
    expect(wb.sheets.map((s) => s.state)).toEqual(['visible', 'hidden']);
    const s = wb.loadSheet(0);
    expect(cellAt(s, 'B3')?.text).toBe('2024-01-01');
    expect(cellAt(s, 'E4')).toMatchObject({
      formula: 'C4*D4',
      sharedFrom: 'E3',
      value: 12,
    });
    expect(cellAt(s, 'E8')).toMatchObject({
      formula: 'SUM(E3:E7)',
      value: 148.49,
    });
    expect(sheetTable(s, 1).columns).toEqual([
      'Item',
      'Ordered',
      'Quantity',
      'Price',
      'Total',
    ]);
  });
});

const cellAt = (
  sheet: ReturnType<ReturnType<typeof readWorkbook>['loadSheet']>,
  ref: string,
) => {
  const m = /^([A-Z]+)(\d+)$/.exec(ref)!;
  let col = 0;
  for (const ch of m[1]) col = col * 26 + ch.charCodeAt(0) - 64;
  return sheet.rows[Number(m[2]) - 1]?.[col - 1];
};

describe('readWorkbook with the shared writer', () => {
  it('reads a workbook written by toXlsx', () => {
    const bytes = toXlsx(
      [
        { name: 'Ada', age: 36, ok: true },
        { name: 'Grace <&>', age: 85.5, ok: false },
      ],
      ['name', 'age', 'ok'],
      'People',
    );
    const wb = readWorkbook(bytes);
    expect(wb.sheets).toEqual([
      {
        name: 'People',
        state: 'visible',
        kind: 'worksheet',
        part: 'xl/worksheets/sheet1.xml',
      },
    ]);
    expect(wb.date1904).toBe(false);
    const sheet = wb.loadSheet(0);
    expect(sheet.rowCount).toBe(3);
    expect(sheet.colCount).toBe(3);
    expect(sheetTable(sheet, 0)).toEqual({
      columns: ['name', 'age', 'ok'],
      rows: [
        { name: 'Ada', age: 36, ok: true },
        { name: 'Grace <&>', age: 85.5, ok: false },
      ],
    });
    expect(sheetToCsv(sheet, 0)).toBe(
      'name,age,ok\nAda,36,true\nGrace <&>,85.5,false\n',
    );
  });
});

describe('readWorkbook with a rich fixture', () => {
  const wb = readWorkbook(richWorkbook());
  const sheet = wb.loadSheet(0);

  it('lists sheets with their state and kind', () => {
    expect(wb.sheets.map((s) => [s.name, s.state, s.kind])).toEqual([
      ['Data', 'visible', 'worksheet'],
      ['Secret', 'hidden', 'worksheet'],
      ['Chart', 'visible', 'chartsheet'],
    ]);
    expect(wb.loadSheet(1).rows[0][0]).toMatchObject({
      type: 'number',
      value: 42,
    });
    expect(() => wb.loadSheet(2)).toThrow(/chart sheet/);
  });

  it('reads shared, rich and inline strings', () => {
    expect(cellAt(sheet, 'A1')).toMatchObject({
      type: 'string',
      text: 'Name',
      raw: '0',
    });
    expect(cellAt(sheet, 'A3')?.text).toBe('Bold and plain');
    expect(cellAt(sheet, 'C1')?.text).toBe('Score');
    expect(cellAt(sheet, 'D1')?.text).toBe('Rich');
    expect(cellAt(sheet, 'E5')?.text).toBe('Line\r\nbreak');
  });

  it('reads numbers, booleans and errors', () => {
    expect(cellAt(sheet, 'C2')).toMatchObject({
      type: 'number',
      value: 0.1,
      text: '0.1',
    });
    expect(cellAt(sheet, 'D2')).toMatchObject({
      type: 'boolean',
      value: true,
      text: 'TRUE',
    });
    expect(cellAt(sheet, 'F2')).toMatchObject({
      type: 'error',
      text: '#DIV/0!',
    });
    // A percent format is not a date.
    expect(cellAt(sheet, 'D4')).toMatchObject({ type: 'number', value: 0.25 });
  });

  it('reads dates by their number format', () => {
    expect(cellAt(sheet, 'B2')).toMatchObject({
      type: 'date',
      text: '2023-03-15',
      raw: '45000',
      style: 1,
    });
    expect(cellAt(sheet, 'E2')?.text).toBe('2023-03-15 12:00:00');
    expect(cellAt(sheet, 'E3')?.text).toBe('36:00:00');
    expect(cellAt(sheet, 'F3')?.text).toBe('18:00:00');
  });

  it('reads dates in the 1904 system', () => {
    const s = readWorkbook(richWorkbook(true)).loadSheet(0);
    expect(readWorkbook(richWorkbook(true)).date1904).toBe(true);
    expect(cellAt(s, 'B2')?.text).toBe('2027-03-16');
  });

  it('keeps formulas with their cached values, and moves shared ones', () => {
    expect(cellAt(sheet, 'C3')).toMatchObject({ formula: 'C2*2', value: 0.2 });
    expect(cellAt(sheet, 'D3')).toMatchObject({
      formula: 'A2&"!"',
      text: 'Ada!',
      type: 'string',
    });
    expect(cellAt(sheet, 'C4')).toMatchObject({
      formula: 'C3+$C$2',
      value: 0.3,
    });
    expect(cellAt(sheet, 'C5')).toMatchObject({
      formula: 'C4+$C$2',
      sharedFrom: 'C4',
      value: 0.4,
    });
  });

  it('places sparse cells and cells without references', () => {
    expect(cellAt(sheet, 'A9')?.text).toBe('no ref 1');
    expect(cellAt(sheet, 'B9')?.text).toBe('no ref 2');
    expect(cellAt(sheet, 'AB9')?.value).toBe(7);
    expect(sheet.rowCount).toBe(9);
    expect(sheet.colCount).toBe(28);
    expect(sheet.rows[7]).toBeUndefined();
  });

  it('reads merged ranges', () => {
    expect(sheet.merges).toEqual([
      { start: { row: 5, col: 0 }, end: { row: 6, col: 2 } },
    ]);
  });

  it('exports with letters or the header row, and searches', () => {
    const lettered = sheetTable(sheet, null);
    expect(lettered.columns.slice(0, 3)).toEqual(['A', 'B', 'C']);
    expect(lettered.rows).toHaveLength(9);
    const named = sheetTable(sheet, 0);
    expect(named.columns.slice(0, 5)).toEqual([
      'Name',
      'Joined',
      'Score',
      'Rich',
      'E',
    ]);
    expect(named.rows[0]).toMatchObject({
      Name: 'Ada',
      Joined: '2023-03-15',
      Score: 0.1,
      Rich: true,
    });
    expect(JSON.parse(sheetToJson(sheet, 0))).toHaveLength(8);
    expect(sheetTable(sheet, 2).rows).toHaveLength(6);
    expect(sheetToCsv(sheet, null).split('\n')[0]).toBe(
      'Name,Joined,Score,Rich,,,,,,,,,,,,,,,,,,,,,,,,',
    );
    expect(searchRows(sheet, 'ada')).toEqual([1, 2]);
    expect(searchRows(sheet, '$c$2')).toEqual([3, 4]);
    expect(searchRows(sheet, '')).toHaveLength(9);
  });
});

describe('readWorkbook edge cases', () => {
  it('reads prefixed (namespaced) elements', () => {
    const wb = readWorkbook(
      buildWorkbook({
        prefix: 'x:',
        sheets: [
          {
            name: 'P',
            xml: '<x:sheetData><x:row r="1"><x:c r="B1"><x:v>5</x:v></x:c></x:row></x:sheetData>',
          },
        ],
      }),
    );
    expect(wb.loadSheet(0).rows[0][1]?.value).toBe(5);
  });

  it('refuses things that are not XLSX workbooks', () => {
    expect(() => readWorkbook(strToU8('a,b\n1,2\n'))).toThrow(/not an XLSX/);
    expect(() =>
      readWorkbook(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0, 0, 0, 0])),
    ).toThrow(/older .xls/);
    expect(() => readWorkbook(zipSync({ 'a.txt': strToU8('x') }))).toThrow(
      /no workbook/,
    );
  });

  it('refuses a part that would expand past the limit (zip bomb)', () => {
    const big = new Uint8Array(MAX_PART_BYTES + 1);
    const bytes = buildWorkbook({
      sheets: [{ name: 'S', xml: '<sheetData/>' }],
    });
    const files: Record<string, Uint8Array> = {};
    // Re-pack with a huge, highly compressible sheet.
    Object.assign(files, unzipSync(bytes));
    files['xl/worksheets/sheet1.xml'] = big;
    const bomb = zipSync(files, { level: 9 });
    expect(bomb.length).toBeLessThan(1_000_000);
    const wb = readWorkbook(bomb);
    expect(() => wb.loadSheet(0)).toThrow(/uncompressed; the limit is 64/);
  });

  it('caps the rows and columns shown and counts what it left out', () => {
    const wb = readWorkbook(
      buildWorkbook({
        sheets: [
          {
            name: 'Far',
            xml: `<sheetData><row r="1"><c r="A1"><v>1</v></c><c r="ALM1"><v>2</v></c></row><row r="${MAX_ROWS + 5}"><c r="A${MAX_ROWS + 5}"><v>3</v></c></row></sheetData>`,
          },
        ],
      }),
    );
    const s = wb.loadSheet(0);
    expect(s.colCount).toBe(1);
    expect(MAX_COLUMNS).toBe(1000);
    expect(s.skipped).toBe(2);
    expect(s.rowCount).toBe(1);
  });

  it('explains malformed XML', () => {
    const wb = readWorkbook(
      buildWorkbook({ sheets: [{ name: 'S', xml: '<sheetData><row>' }] }),
    );
    expect(() => wb.loadSheet(0)).toThrow(/not well-formed/);
  });

  it('notes macros in an .xlsm', () => {
    const files = unzipSync(
      buildWorkbook({ sheets: [{ name: 'S', xml: '<sheetData/>' }] }),
    );
    files['xl/vbaProject.bin'] = new Uint8Array([1, 2, 3]);
    expect(readWorkbook(zipSync(files)).hasMacros).toBe(true);
  });
});
