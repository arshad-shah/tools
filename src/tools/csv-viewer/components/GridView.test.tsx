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

function Harness({
  initial = {},
  onSelectedRowsChange,
}: {
  initial?: GridFilters;
  onSelectedRowsChange?(rows: number[]): void;
}) {
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
      onSelectedRowsChange={onSelectedRowsChange ?? (() => {})}
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

  it('reports the selected rows as table row indices', () => {
    const onSelectedRowsChange = vi.fn();
    render(
      <Harness
        initial={{ n: { kind: 'range', min: 10, max: 20 } }}
        onSelectedRowsChange={onSelectedRowsChange}
      />,
    );
    // The filter leaves rows 1, 3 and 5; the first one starts selected.
    expect(onSelectedRowsChange).toHaveBeenLastCalledWith([1]);
    const g = screen.getByRole('grid', { name: 'Table data' });
    g.focus();
    fireEvent.keyDown(g, { key: 'ArrowDown', shiftKey: true });
    expect(onSelectedRowsChange).toHaveBeenLastCalledWith([1, 3]);
    // Sorting keeps the view positions and maps them to the new rows.
    fireEvent.click(screen.getByRole('button', { name: 'n' }));
    fireEvent.click(screen.getByRole('button', { name: 'n' }));
    expect(onSelectedRowsChange).toHaveBeenLastCalledWith([5, 3]);
  });
});
