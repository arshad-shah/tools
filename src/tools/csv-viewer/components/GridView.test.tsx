/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GridFilters, SortKey } from '@/shared/ui';
import { mockViewport } from '@/shared/ui/data-grid/test-utils';
import type { Table } from '../lib/edit';
import { tableView } from '../lib/view';
import { GridView } from './GridView';

const table: Table = {
  columns: ['name', 'n'],
  rows: Array.from({ length: 10 }, (_, i) => ({
    name: `item${i % 3}`,
    n: [5, 12, 30, 15, 2, 20, 8, 25, 1, 40][i],
  })),
};
const types = { name: 'text', n: 'integer' } as const;

function Harness({ initial = {} }: { initial?: GridFilters }) {
  const [filters, setFilters] = useState<GridFilters>(initial);
  const [sort, setSort] = useState<SortKey[]>([]);
  const [search, setSearch] = useState('');
  const view = tableView(table, types, filters, sort, search);
  return (
    <GridView
      table={table}
      types={types}
      indices={view.indices}
      filters={filters}
      onFiltersChange={setFilters}
      filterErrors={view.errors}
      sort={sort}
      onSortChange={setSort}
      search={search}
      onSearchChange={setSearch}
      hidden={[]}
      onHiddenChange={() => {}}
      compact={false}
      onCellEdit={() => {}}
    />
  );
}

const header = (name: string) =>
  screen
    .getAllByRole('columnheader')
    .find((h) => h.querySelector('button span')?.textContent === name)!;

beforeEach(() => mockViewport(800, 600));
afterEach(() => vi.restoreAllMocks());

describe('GridView', () => {
  it('counts the rows left by a range filter', () => {
    render(<Harness initial={{ n: { kind: 'range', min: 10, max: 20 } }} />);
    expect(screen.getByText('3 of 10 rows')).toBeTruthy();
  });

  it('counts rows left by the global search', () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText('Search all columns'), {
      target: { value: 'item2' },
    });
    expect(screen.getByText('3 of 10 rows')).toBeTruthy();
  });

  it('Shift-click sorts by a second column', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'name' }));
    fireEvent.click(screen.getByRole('button', { name: 'n' }), {
      shiftKey: true,
    });
    expect(header('name').getAttribute('aria-sort')).toBe('ascending');
    expect(header('n').getAttribute('aria-sort')).toBe('ascending');
  });

  it('shows column type badges', () => {
    render(<Harness />);
    expect(screen.getByText('n: Integer')).toBeTruthy();
    expect(screen.getByText('name: Text')).toBeTruthy();
  });
});
