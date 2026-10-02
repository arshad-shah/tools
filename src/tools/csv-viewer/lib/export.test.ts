import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { exportFileName, exportTable, type ExportTable } from './export';
import { parseDelimited } from './parse';

const table: ExportTable = {
  columns: ['id', 'name', 'note'],
  rows: [
    { id: 1, name: 'Ada', note: 'says "hi", twice', hidden: 'x' },
    { id: 2, name: "O'Brien", note: null, hidden: 'y' },
    { id: 3, name: '00123', note: 'line\nbreak', hidden: 'z' },
  ],
};

const asText = (b: Uint8Array) => new TextDecoder().decode(b);

describe('exportTable', () => {
  it('writes CSV that re-parses to the same rows', () => {
    const f = exportTable(table, 'csv');
    expect(f).toMatchObject({ mime: 'text/csv', extension: 'csv' });
    const back = parseDelimited(asText(f.bytes), ',');
    expect(back.columns).toEqual(table.columns);
    expect(back.data).toEqual(
      table.rows.map(({ id, name, note }) => ({ id, name, note })),
    );
  });

  it('writes TSV with tabs', () => {
    const f = exportTable(table, 'tsv');
    expect(asText(f.bytes).split('\n')[0]).toBe('id\tname\tnote');
    expect(parseDelimited(asText(f.bytes), '\t').data).toHaveLength(3);
  });

  it('writes JSON and NDJSON with only the visible columns', () => {
    const json = JSON.parse(asText(exportTable(table, 'json').bytes));
    expect(json[0]).toEqual({ id: 1, name: 'Ada', note: 'says "hi", twice' });
    const lines = asText(exportTable(table, 'ndjson').bytes).trim().split('\n');
    expect(lines).toHaveLength(3);
    expect(JSON.parse(lines[1])).toEqual({
      id: 2,
      name: "O'Brien",
      note: null,
    });
  });

  it('quotes SQL identifiers and strings for PostgreSQL', () => {
    const sql = asText(
      exportTable(table, 'sql', { sqlDialect: 'postgres', sqlTable: 'people' })
        .bytes,
    );
    expect(sql).toContain('INSERT INTO "people" ("id", "name", "note") VALUES');
    expect(sql).toContain("(2, 'O''Brien', NULL)");
  });

  it('writes a Markdown table', () => {
    const md = asText(exportTable(table, 'markdown').bytes);
    expect(md.split('\n')[1]).toBe('| --- | --- | --- |');
    expect(md).toContain('line<br>break');
  });

  it('writes an XLSX workbook with every row', () => {
    const f = exportTable(table, 'xlsx');
    expect(f.extension).toBe('xlsx');
    const files = unzipSync(f.bytes);
    const sheet = strFromU8(files['xl/worksheets/sheet1.xml']);
    expect(sheet.match(/<row /g)).toHaveLength(4);
  });
});

describe('exportFileName', () => {
  it('names filtered exports by row count', () => {
    expect(exportFileName('sales.csv', 'xlsx', 42)).toBe(
      'sales-filtered-42rows.xlsx',
    );
  });

  it('keeps the plain name when nothing is filtered', () => {
    expect(exportFileName('sales.csv', 'json', null)).toBe('sales.json');
    expect(exportFileName('', 'csv', null)).toBe('data.csv');
  });
});
