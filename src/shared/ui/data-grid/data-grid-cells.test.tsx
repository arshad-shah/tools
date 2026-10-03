/** @vitest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GridColumn, SortKey } from './columns';
import { DataGrid } from './data-grid';
import { grid, mockViewport, people, type Person } from './test-utils';

beforeEach(() => mockViewport());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const onOpen = vi.fn();

const columns: GridColumn<Person>[] = [
  { id: 'name', header: 'Name', accessor: (r) => r.name, width: 100 },
  {
    id: 'age',
    header: 'Age',
    accessor: (r) => r.age,
    type: 'number',
    width: 100,
  },
  {
    id: 'actions',
    header: 'Actions',
    accessor: (r) => `Open ${r.name}`,
    width: 140,
    render: (r) => (
      <button type="button" onClick={() => onOpen(r.id)}>
        Open {r.name}
      </button>
    ),
  },
];

describe('DataGrid custom cells and selected rows', () => {
  it('renders a column through its render function, keeping the accessor for copy', () => {
    render(
      <DataGrid
        rows={people}
        columns={columns}
        rowKey={(r) => r.id}
        ariaLabel="People"
      />,
    );
    const button = screen.getByRole('button', { name: 'Open Grace' });
    expect(button.closest('[role="gridcell"]')).toBeTruthy();
    fireEvent.click(button);
    expect(onOpen).toHaveBeenCalledWith(2);
  });

  it('reports the source rows under the selection, through a sort', () => {
    const onSelectedRowsChange = vi.fn();
    const sort: SortKey[] = [{ id: 'age', dir: 'desc' }];
    render(
      <DataGrid
        rows={people}
        columns={columns}
        rowKey={(r) => r.id}
        ariaLabel="People"
        sort={sort}
        selection="cell-range"
        onSelectedRowsChange={onSelectedRowsChange}
      />,
    );
    // Sorted by age, descending: Grace (1), Alan (2), Barbara (3), Ada (0).
    expect(onSelectedRowsChange).toHaveBeenLastCalledWith([1]);
    const g = grid();
    act(() => g.focus());
    fireEvent.keyDown(g, { key: 'ArrowDown', shiftKey: true });
    fireEvent.keyDown(g, { key: 'ArrowDown', shiftKey: true });
    expect(onSelectedRowsChange).toHaveBeenLastCalledWith([1, 2, 3]);
    const calls = onSelectedRowsChange.mock.calls.length;
    fireEvent.keyDown(g, { key: 'ArrowRight', shiftKey: true });
    // Same rows, wider range: no new call.
    expect(onSelectedRowsChange).toHaveBeenCalledTimes(calls);
  });

  it('reports no rows for an empty grid', () => {
    const onSelectedRowsChange = vi.fn();
    render(
      <DataGrid
        rows={[]}
        columns={columns}
        rowKey={(r) => r.id}
        ariaLabel="People"
        onSelectedRowsChange={onSelectedRowsChange}
      />,
    );
    expect(onSelectedRowsChange).toHaveBeenLastCalledWith([]);
  });
});
