import { describe, expect, it } from 'vitest';
import type { GridColumn } from './columns';
import { applyFilters, isFilterActive } from './filters';

interface Row {
  name: string | null;
  qty: number | null;
  tag: string;
}

const rows: Row[] = [
  { name: 'Alpha', qty: 1, tag: 'red' },
  { name: 'beta', qty: 5, tag: 'blue' },
  { name: 'apple pie', qty: 10, tag: 'red' },
  { name: null, qty: null, tag: 'green' },
  { name: '', qty: 7, tag: 'blue' },
];

const columns: GridColumn<Row>[] = [
  { id: 'name', header: 'Name', accessor: (r) => r.name },
  { id: 'qty', header: 'Qty', accessor: (r) => r.qty, type: 'number' },
  { id: 'tag', header: 'Tag', accessor: (r) => r.tag },
];

const names = (out: { rows: Row[] }) => out.rows.map((r) => r.name);

describe('applyFilters', () => {
  it('text contains is case-insensitive', () => {
    const out = applyFilters(rows, columns, {
      name: { kind: 'text', value: 'AP' },
    });
    expect(names(out)).toEqual(['apple pie']);
    expect(out.errors).toEqual({});
    expect(
      names(
        applyFilters(rows, columns, { name: { kind: 'text', value: 'a' } }),
      ),
    ).toEqual(['Alpha', 'beta', 'apple pie']);
  });

  it('regex ^a matches at the start', () => {
    const out = applyFilters(rows, columns, {
      name: { kind: 'text', value: '^a', regex: true },
    });
    expect(names(out)).toEqual(['Alpha', 'apple pie']);
  });

  it('an invalid regex reports an error entry and passes every row', () => {
    const run = () =>
      applyFilters(rows, columns, {
        name: { kind: 'text', value: '(', regex: true },
        tag: { kind: 'text', value: 'red' },
      });
    expect(run).not.toThrow();
    const out = run();
    expect(out.errors.name).toMatch(/regular expression/i);
    // Only the tag filter applied.
    expect(names(out)).toEqual(['Alpha', 'apple pie']);
  });

  it('range with open ends', () => {
    const min = applyFilters(rows, columns, {
      qty: { kind: 'range', min: 5 },
    });
    expect(min.rows.map((r) => r.qty)).toEqual([5, 10, 7]);
    const max = applyFilters(rows, columns, {
      qty: { kind: 'range', max: 5 },
    });
    expect(max.rows.map((r) => r.qty)).toEqual([1, 5]);
    const both = applyFilters(rows, columns, {
      qty: { kind: 'range', min: 2, max: 8 },
    });
    expect(both.rows.map((r) => r.qty)).toEqual([5, 7]);
    const open = applyFilters(rows, columns, { qty: { kind: 'range' } });
    expect(open.rows).toHaveLength(rows.length);
  });

  it('empty and not empty', () => {
    const empty = applyFilters(rows, columns, {
      name: { kind: 'empty', empty: true },
    });
    expect(empty.rows.map((r) => r.tag)).toEqual(['green', 'blue']);
    const filled = applyFilters(rows, columns, {
      name: { kind: 'empty', empty: false },
    });
    expect(names(filled)).toEqual(['Alpha', 'beta', 'apple pie']);
  });

  it('value set keeps rows whose value is in the set', () => {
    const out = applyFilters(rows, columns, {
      tag: { kind: 'set', values: ['blue', 'green'] },
    });
    expect(out.rows.map((r) => r.tag)).toEqual(['blue', 'green', 'blue']);
    const none = applyFilters(rows, columns, {
      tag: { kind: 'set', values: [] },
    });
    expect(none.rows).toHaveLength(rows.length);
  });

  it('combines columns with AND and ignores unknown columns', () => {
    const out = applyFilters(rows, columns, {
      tag: { kind: 'set', values: ['red'] },
      qty: { kind: 'range', min: 2 },
      missing: { kind: 'text', value: 'x' },
    });
    expect(names(out)).toEqual(['apple pie']);
  });

  it('isFilterActive is false for blank filters', () => {
    expect(isFilterActive({ kind: 'text', value: '' })).toBe(false);
    expect(isFilterActive({ kind: 'range' })).toBe(false);
    expect(isFilterActive({ kind: 'set', values: [] })).toBe(false);
    expect(isFilterActive({ kind: 'empty', empty: false })).toBe(true);
  });
});
