/** @vitest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GridColumn } from './columns';
import { DataGrid, type DataGridProps } from './data-grid';
import { applyFilters, type GridFilters } from './filters';
import {
  activeCell,
  grid,
  mockViewport,
  people,
  type Person,
} from './test-utils';

beforeEach(() => mockViewport());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const columns: GridColumn<Person>[] = [
  { id: 'name', header: 'Name', accessor: (r) => r.name, width: 100 },
  { id: 'age', header: 'Age', accessor: (r) => r.age, type: 'number' },
  { id: 'city', header: 'City', accessor: (r) => r.city, width: 100 },
];

type Extra = Partial<DataGridProps<Person>>;

function Filtered(extra: Extra) {
  const [filters, setFilters] = useState<GridFilters>({});
  const { rows } = applyFilters(people, columns, filters);
  return (
    <DataGrid
      rows={rows}
      columns={columns}
      rowKey={(r) => r.id}
      ariaLabel="People"
      filters={filters}
      onFiltersChange={setFilters}
      {...extra}
    />
  );
}

const focusGrid = () => {
  const g = grid();
  act(() => g.focus());
  return g;
};

describe('DataGrid filters, search, selection, details and editing', () => {
  it('opens the filter popover from the header button and filters through the caller', () => {
    render(<Filtered />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Column options Name' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Filter' }));
    const pop = screen.getByRole('dialog', { name: 'Filter Name' });
    expect(pop).toBeTruthy();
    fireEvent.change(screen.getByRole('textbox', { name: 'Contains' }), {
      target: { value: 'al' },
    });
    expect(grid().getAttribute('aria-rowcount')).toBe('2');
    expect(screen.getByText('Alan')).toBeTruthy();

    // An invalid regex is reported in the popover and filters nothing.
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Regular expression' }),
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'Contains' }), {
      target: { value: '(' },
    });
    expect(screen.getByText(/Invalid regular expression/)).toBeTruthy();
    expect(grid().getAttribute('aria-rowcount')).toBe('5');

    fireEvent.click(screen.getByRole('button', { name: 'Clear filter' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('offers a number range for number columns', () => {
    render(<Filtered />);
    fireEvent.click(screen.getByRole('button', { name: 'Column options Age' }));
    fireEvent.click(screen.getByRole('button', { name: 'Filter' }));
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Minimum' }), {
      target: { value: '40' },
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Maximum' }), {
      target: { value: '50' },
    });
    expect(grid().getAttribute('aria-rowcount')).toBe('3');
  });

  it('highlights search matches without filtering', () => {
    render(<Filtered search="ar" />);
    const marks = grid().querySelectorAll('mark');
    expect([...marks].map((m) => m.textContent)).toEqual(['Ar', 'ar', 'ar']);
    expect(grid().getAttribute('aria-rowcount')).toBe('5');
  });

  it('Shift+Arrow extends the cell range and Mod+C copies it as TSV', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
    const rows = [
      { id: 1, name: 'a', age: 0, city: 'b' },
      { id: 2, name: 'c', age: 0, city: 'd' },
    ];
    render(
      <DataGrid
        rows={rows}
        columns={[columns[0], columns[2]]}
        rowKey={(r) => r.id}
        ariaLabel="Letters"
        selection="cell-range"
      />,
    );
    const g = focusGrid();
    expect(g.getAttribute('aria-multiselectable')).toBe('true');
    fireEvent.keyDown(g, { key: 'ArrowRight', shiftKey: true });
    fireEvent.keyDown(g, { key: 'ArrowDown', shiftKey: true });
    const selected = screen
      .getAllByRole('gridcell')
      .filter((c) => c.getAttribute('aria-selected') === 'true');
    expect(selected).toHaveLength(4);
    await act(async () => {
      fireEvent.keyDown(g, { key: 'c', ctrlKey: true });
    });
    expect(writeText).toHaveBeenCalledWith('a\tb\nc\td');

    // A plain arrow collapses the range again.
    fireEvent.keyDown(g, { key: 'ArrowUp' });
    expect(
      screen
        .getAllByRole('gridcell')
        .filter((c) => c.getAttribute('aria-selected') === 'true'),
    ).toHaveLength(1);
  });

  it('Enter opens the row details drawer and calls onRowActivate', () => {
    const onRowActivate = vi.fn();
    render(
      <Filtered
        onRowActivate={onRowActivate}
        renderDetails={(r) => <p>{`Details for ${r.name}`}</p>}
      />,
    );
    const g = focusGrid();
    fireEvent.keyDown(g, { key: 'ArrowDown' });
    fireEvent.keyDown(g, { key: 'Enter' });
    expect(screen.getByRole('dialog', { name: 'Row 2' })).toBeTruthy();
    expect(screen.getByText('Details for Grace')).toBeTruthy();
    expect(onRowActivate).toHaveBeenCalledWith(people[1]);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('F2 edits a cell, Enter commits through onCellEdit and Escape cancels', () => {
    const onCellEdit = vi.fn();
    render(
      <Filtered editable={(c) => c.id !== 'city'} onCellEdit={onCellEdit} />,
    );
    const g = focusGrid();
    fireEvent.keyDown(g, { key: 'ArrowRight' });
    fireEvent.keyDown(g, { key: 'F2' });
    const input = screen.getByRole('textbox', { name: 'Edit Age' });
    expect(document.activeElement).toBe(input);
    fireEvent.change(input, { target: { value: '37' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCellEdit).toHaveBeenCalledWith(0, 'age', 37);
    expect(screen.queryByRole('textbox', { name: 'Edit Age' })).toBeNull();
    expect(document.activeElement).toBe(g);

    // Escape cancels without a call.
    fireEvent.keyDown(g, { key: 'F2' });
    const again = screen.getByRole('textbox', { name: 'Edit Age' });
    fireEvent.change(again, { target: { value: '99' } });
    fireEvent.keyDown(again, { key: 'Escape' });
    expect(onCellEdit).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(activeCell()?.textContent).toBe('36');

    // An invalid number stays open.
    fireEvent.keyDown(g, { key: 'F2' });
    const bad = screen.getByRole('textbox', { name: 'Edit Age' });
    fireEvent.change(bad, { target: { value: 'abc' } });
    fireEvent.keyDown(bad, { key: 'Enter' });
    expect(bad.getAttribute('aria-invalid')).toBe('true');
    fireEvent.keyDown(bad, { key: 'Escape' });

    // Read-only columns ignore F2.
    fireEvent.keyDown(g, { key: 'ArrowRight' });
    fireEvent.keyDown(g, { key: 'F2' });
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('double-click edits an editable cell', () => {
    const onCellEdit = vi.fn();
    render(<Filtered editable={() => true} onCellEdit={onCellEdit} />);
    fireEvent.doubleClick(screen.getByText('Grace'));
    const input = screen.getByRole('textbox', { name: 'Edit Name' });
    fireEvent.change(input, { target: { value: 'Grace H' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCellEdit).toHaveBeenCalledWith(1, 'name', 'Grace H');
  });
});
