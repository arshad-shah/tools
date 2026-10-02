import { describe, expect, it } from 'vitest';
import type { Table } from './edit';
import { tableView } from './view';

const table: Table = {
  columns: ['name', 'n'],
  rows: [
    { name: 'b', n: 12 },
    { name: 'a', n: 5 },
    { name: 'c', n: 20 },
    { name: 'a', n: 15 },
  ],
};
const types = { name: 'text', n: 'integer' } as const;

describe('tableView', () => {
  it('filters a range, then sorts by two keys', () => {
    const v = tableView(
      table,
      types,
      { n: { kind: 'range', min: 10, max: 20 } },
      [
        { id: 'name', dir: 'asc' },
        { id: 'n', dir: 'desc' },
      ],
      '',
    );
    expect(v.indices).toEqual([3, 0, 2]);
  });

  it('searches every column', () => {
    expect(tableView(table, types, {}, [], 'C').indices).toEqual([2]);
    expect(tableView(table, types, {}, [], '15').indices).toEqual([3]);
  });

  it('reports an invalid regex filter and filters nothing', () => {
    const v = tableView(
      table,
      types,
      { name: { kind: 'text', value: '(', regex: true } },
      [],
      '',
    );
    expect(v.indices).toHaveLength(4);
    expect(v.errors.name).toBeTruthy();
  });
});
