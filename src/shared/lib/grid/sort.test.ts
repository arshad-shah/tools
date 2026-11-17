import { describe, expect, it } from 'vitest';
import type { GridColumn } from './columns';
import { multiSort, nextSort, sortIndices } from './sort';

interface Row {
  id: number;
  name: string | null;
  qty: number | null;
  when?: string | Date | null;
}

const columns: GridColumn<Row>[] = [
  { id: 'id', header: 'Id', accessor: (r) => r.id, type: 'number' },
  { id: 'name', header: 'Name', accessor: (r) => r.name },
  { id: 'qty', header: 'Qty', accessor: (r) => r.qty, type: 'number' },
  { id: 'when', header: 'When', accessor: (r) => r.when, type: 'date' },
];

const ids = (rows: Row[]) => rows.map((r) => r.id);

describe('multiSort', () => {
  it('is stable: equal keys keep their input order', () => {
    const rows: Row[] = [
      { id: 1, name: 'b', qty: 1 },
      { id: 2, name: 'a', qty: 1 },
      { id: 3, name: 'b', qty: 1 },
      { id: 4, name: 'a', qty: 1 },
    ];
    expect(ids(multiSort(rows, [{ id: 'name', dir: 'asc' }], columns))).toEqual(
      [2, 4, 1, 3],
    );
    expect(
      ids(multiSort(rows, [{ id: 'name', dir: 'desc' }], columns)),
    ).toEqual([1, 3, 2, 4]);
  });

  it('sorts by several keys in priority order', () => {
    const rows: Row[] = [
      { id: 1, name: 'b', qty: 2 },
      { id: 2, name: 'a', qty: 2 },
      { id: 3, name: 'b', qty: 1 },
      { id: 4, name: 'a', qty: 1 },
    ];
    const sorted = multiSort(
      rows,
      [
        { id: 'name', dir: 'asc' },
        { id: 'qty', dir: 'desc' },
      ],
      columns,
    );
    expect(ids(sorted)).toEqual([2, 4, 1, 3]);
  });

  it('puts nulls last in both directions', () => {
    const rows: Row[] = [
      { id: 1, name: null, qty: null },
      { id: 2, name: 'x', qty: 5 },
      { id: 3, name: '', qty: Number.NaN },
      { id: 4, name: 'y', qty: 1 },
    ];
    expect(ids(multiSort(rows, [{ id: 'qty', dir: 'asc' }], columns))).toEqual([
      4, 2, 1, 3,
    ]);
    expect(ids(multiSort(rows, [{ id: 'qty', dir: 'desc' }], columns))).toEqual(
      [2, 4, 1, 3],
    );
    expect(
      ids(multiSort(rows, [{ id: 'name', dir: 'desc' }], columns)),
    ).toEqual([4, 2, 1, 3]);
  });

  it('compares text with numeric collation', () => {
    const rows: Row[] = ['item10', 'item2', 'Item1'].map((name, id) => ({
      id,
      name,
      qty: 0,
    }));
    const names = multiSort(rows, [{ id: 'name', dir: 'asc' }], columns).map(
      (r) => r.name,
    );
    expect(names).toEqual(['Item1', 'item2', 'item10']);
  });

  it('orders numbers numerically and dates by value', () => {
    const rows: Row[] = [
      { id: 1, name: 'a', qty: 10, when: '2024-03-01' },
      { id: 2, name: 'a', qty: 9, when: new Date('2023-01-01') },
      { id: 3, name: 'a', qty: 100, when: 'not a date' },
    ];
    expect(ids(multiSort(rows, [{ id: 'qty', dir: 'asc' }], columns))).toEqual([
      2, 1, 3,
    ]);
    expect(ids(multiSort(rows, [{ id: 'when', dir: 'asc' }], columns))).toEqual(
      [2, 1, 3],
    );
  });

  it('returns the input order for an empty sort and ignores unknown ids', () => {
    const rows: Row[] = [
      { id: 2, name: 'b', qty: 1 },
      { id: 1, name: 'a', qty: 1 },
    ];
    expect(ids(multiSort(rows, [], columns))).toEqual([2, 1]);
    expect(sortIndices(rows, [{ id: 'nope', dir: 'asc' }], columns)).toEqual([
      0, 1,
    ]);
  });
});

describe('nextSort', () => {
  it('cycles a single key through asc, desc and none', () => {
    let s = nextSort([], 'a', false);
    expect(s).toEqual([{ id: 'a', dir: 'asc' }]);
    s = nextSort(s, 'a', false);
    expect(s).toEqual([{ id: 'a', dir: 'desc' }]);
    expect(nextSort(s, 'a', false)).toEqual([]);
  });

  it('additive adds a secondary key, a plain click replaces all keys', () => {
    const one = nextSort([], 'a', false);
    const two = nextSort(one, 'b', true);
    expect(two).toEqual([
      { id: 'a', dir: 'asc' },
      { id: 'b', dir: 'asc' },
    ]);
    expect(nextSort(two, 'b', true)).toEqual([
      { id: 'a', dir: 'asc' },
      { id: 'b', dir: 'desc' },
    ]);
    expect(nextSort(two, 'c', false)).toEqual([{ id: 'c', dir: 'asc' }]);
  });
});
