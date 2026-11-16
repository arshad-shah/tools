/** @vitest-environment jsdom */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GridFilters, SortKey } from '@/shared/ui';
import { mockViewport } from '@/shared/ui/data-grid/test-utils';
import type { CellChange, Table } from '../lib/edit';
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
  onRowEdit,
}: {
  initial?: GridFilters;
  onSelectedRowsChange?(rows: number[]): void;
  onRowEdit?(cells: CellChange[]): void;
}) {
  const [filters, setFilters] = useState<GridFilters>(initial);
  const [sort, setSort] = useState<SortKey[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<number[]>([]);
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
      onCompactChange={() => {}}
      onRowEdit={onRowEdit ?? (() => {})}
      selectedRows={selected}
      onSelectedRowsChange={(rows) => {
        setSelected(rows);
        onSelectedRowsChange?.(rows);
      }}
    />
  );
}

const header = (name: string) =>
  screen
    .getAllByRole('columnheader')
    .find((h) => h.textContent?.trim() === name)!;
const cell = (text: string) => screen.getByRole('gridcell', { name: text });

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

  it('a header click sorts by that column, a second click reverses it', () => {
    render(<Harness />);
    fireEvent.click(within(header('n')).getByRole('button'));
    expect(header('n').getAttribute('aria-sort')).toBe('ascending');
    expect(screen.getAllByRole('row')[1].textContent).toContain('1');
    fireEvent.click(within(header('n')).getByRole('button'));
    expect(header('n').getAttribute('aria-sort')).toBe('descending');
    expect(screen.getAllByRole('row')[1].textContent).toContain('40');
  });

  it('filters from the Filters popover', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
    fireEvent.change(screen.getByLabelText('n minimum'), {
      target: { value: '10' },
    });
    fireEvent.change(screen.getByLabelText('n maximum'), {
      target: { value: '20' },
    });
    expect(screen.getByText('3 of 10 rows')).toBeTruthy();
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
    // The filter leaves rows 1, 3 and 5.
    fireEvent.click(cell('12'));
    expect(onSelectedRowsChange).toHaveBeenLastCalledWith([1]);
    fireEvent.click(cell('20'), { ctrlKey: true });
    expect(onSelectedRowsChange).toHaveBeenLastCalledWith([1, 5]);
  });

  it('a double-clicked row opens to edit and saves only changed cells', () => {
    const onRowEdit = vi.fn();
    render(<Harness onRowEdit={onRowEdit} />);
    fireEvent.doubleClick(cell('30'));
    const dialog = screen.getByRole('dialog', { name: 'Edit row 3' });
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'n' }), {
      target: { value: 'x' },
    });
    expect(within(dialog).getByText('Enter a number')).toBeTruthy();
    fireEvent.change(within(dialog).getByRole('textbox', { name: 'n' }), {
      target: { value: '31' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save row' }));
    expect(onRowEdit).toHaveBeenCalledWith([{ row: 2, col: 'n', value: 31 }]);
  });
});
