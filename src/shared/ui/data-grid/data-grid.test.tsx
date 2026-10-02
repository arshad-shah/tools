/** @vitest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useMemo, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GridColumn, SortKey } from './columns';
import { DataGrid } from './data-grid';
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

const personColumns: GridColumn<Person>[] = [
  { id: 'name', header: 'Name', accessor: (r) => r.name, width: 200 },
  {
    id: 'age',
    header: 'Age',
    accessor: (r) => r.age,
    type: 'number',
    width: 180,
  },
  { id: 'city', header: 'City', accessor: (r) => r.city, width: 200 },
];

function People({
  onSort,
  onColumns,
}: {
  onSort?: (s: SortKey[]) => void;
  onColumns?: (c: GridColumn<Person>[]) => void;
}) {
  return (
    <DataGrid
      rows={people}
      columns={personColumns}
      rowKey={(r) => r.id}
      ariaLabel="People"
      onSortChange={onSort}
      onColumnsChange={onColumns}
    />
  );
}

const header = (name: string) =>
  screen
    .getAllByRole('columnheader')
    .find(
      (h) => h.querySelector('button span')?.textContent === name,
    ) as HTMLElement;
const sortButton = (name: string) => screen.getByRole('button', { name });
const firstColumnTexts = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((r) => r.querySelector('[role="gridcell"]')?.textContent);

describe('DataGrid core', () => {
  it('is a labelled grid with aria-rowcount (rows plus header) and aria-colcount', () => {
    render(<People />);
    const g = screen.getByRole('grid', { name: 'People' });
    expect(g.getAttribute('aria-rowcount')).toBe('5');
    expect(g.getAttribute('aria-colcount')).toBe('3');
    expect(g.tabIndex).toBe(0);
    const headerRow = document.getElementById(
      g.getAttribute('aria-owns') as string,
    );
    expect(headerRow?.getAttribute('role')).toBe('row');
    expect(headerRow?.getAttribute('aria-rowindex')).toBe('1');
    expect(screen.getAllByRole('columnheader')).toHaveLength(3);
    const bodyRows = screen.getAllByRole('row').slice(1);
    expect(bodyRows[0].getAttribute('aria-rowindex')).toBe('2');
    const cells = bodyRows[0].querySelectorAll('[role="gridcell"]');
    expect(cells[1].getAttribute('aria-colindex')).toBe('2');
  });

  it('clicking a header sorts ascending, then descending, then none', () => {
    const onSort = vi.fn();
    render(<People onSort={onSort} />);
    fireEvent.click(sortButton('Name'));
    expect(header('Name').getAttribute('aria-sort')).toBe('ascending');
    expect(firstColumnTexts()).toEqual(['Ada', 'Alan', 'Barbara', 'Grace']);
    fireEvent.click(sortButton('Name'));
    expect(header('Name').getAttribute('aria-sort')).toBe('descending');
    expect(firstColumnTexts()).toEqual(['Grace', 'Barbara', 'Alan', 'Ada']);
    fireEvent.click(sortButton('Name'));
    expect(header('Name').hasAttribute('aria-sort')).toBe(false);
    expect(firstColumnTexts()).toEqual(['Ada', 'Grace', 'Alan', 'Barbara']);
    expect(onSort).toHaveBeenLastCalledWith([]);
  });

  it('Shift+click adds a secondary sort key reflected in aria-sort', () => {
    const onSort = vi.fn();
    render(<People onSort={onSort} />);
    fireEvent.click(sortButton('City'));
    fireEvent.click(sortButton('Age'), { shiftKey: true });
    expect(onSort).toHaveBeenLastCalledWith([
      { id: 'city', dir: 'asc' },
      { id: 'age', dir: 'asc' },
    ]);
    expect(header('City').getAttribute('aria-sort')).toBe('ascending');
    expect(header('Age').getAttribute('aria-sort')).toBe('ascending');
    expect(header('Age').textContent).toContain('sort priority 2');
    fireEvent.click(sortButton('Age'), { shiftKey: true });
    expect(header('Age').getAttribute('aria-sort')).toBe('descending');
    expect(header('City').getAttribute('aria-sort')).toBe('ascending');
    // A plain click replaces every key.
    fireEvent.click(sortButton('Age'));
    expect(header('City').hasAttribute('aria-sort')).toBe(false);
  });

  it('arrow keys move the active cell; Home and End stay in the row; Mod+Home goes to the first cell', () => {
    render(<People />);
    const g = grid();
    act(() => g.focus());
    expect(activeCell()?.textContent).toBe('Ada');
    fireEvent.keyDown(g, { key: 'ArrowRight' });
    expect(activeCell()?.textContent).toBe('36');
    fireEvent.keyDown(g, { key: 'ArrowDown' });
    expect(activeCell()?.textContent).toBe('85');
    fireEvent.keyDown(g, { key: 'End' });
    expect(activeCell()?.textContent).toBe('Arlington');
    fireEvent.keyDown(g, { key: 'Home' });
    expect(activeCell()?.textContent).toBe('Grace');
    fireEvent.keyDown(g, { key: 'ArrowDown' });
    fireEvent.keyDown(g, { key: 'ArrowRight' });
    expect(activeCell()?.textContent).toBe('41');
    fireEvent.keyDown(g, { key: 'Home', ctrlKey: true });
    expect(activeCell()?.textContent).toBe('Ada');
    fireEvent.keyDown(g, { key: 'ArrowUp' });
    fireEvent.keyDown(g, { key: 'ArrowLeft' });
    expect(activeCell()?.textContent).toBe('Ada');
    fireEvent.keyDown(g, { key: 'End', ctrlKey: true });
    expect(activeCell()?.textContent).toBe('Boston');
  });

  it('dragging the resize handle with the pointer changes the width', () => {
    const onColumns = vi.fn();
    render(<People onColumns={onColumns} />);
    const handle = screen.getByRole('separator', { name: 'Resize Name' });
    fireEvent.pointerDown(handle, { button: 0, clientX: 100 });
    fireEvent.pointerMove(handle, { clientX: 150 });
    expect(header('Name').style.width).toBe('250px');
    expect(onColumns).not.toHaveBeenCalled();
    fireEvent.pointerMove(handle, { clientX: 160 });
    fireEvent.pointerUp(handle, { clientX: 160 });
    expect(header('Name').style.width).toBe('260px');
    expect(onColumns).toHaveBeenCalledTimes(1);
    expect(onColumns.mock.calls[0][0][0]).toMatchObject({
      id: 'name',
      width: 260,
    });
    const cell = screen.getAllByRole('gridcell')[0];
    expect(cell.style.width).toBe('260px');
  });

  it('the header menu resizes from the keyboard with Wider and Narrower', () => {
    render(<People />);
    fireEvent.click(screen.getByRole('button', { name: 'Column options Age' }));
    const menu = screen.getByRole('dialog', { name: 'Age column options' });
    expect(menu).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Wider' }));
    expect(header('Age').style.width).toBe('196px');
    fireEvent.click(screen.getByRole('button', { name: 'Wider' }));
    fireEvent.click(screen.getByRole('button', { name: 'Narrower' }));
    expect(header('Age').style.width).toBe('196px');
  });

  it('hides, shows and moves columns from the header menu', () => {
    render(<People />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Column options Name' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Move right' }));
    expect(
      screen
        .getAllByRole('columnheader')
        .map((h) => h.querySelector('button span')?.textContent),
    ).toEqual(['Age', 'Name', 'City']);
    fireEvent.click(screen.getByRole('button', { name: 'Hide column' }));
    expect(grid().getAttribute('aria-colcount')).toBe('2');
    fireEvent.click(
      screen.getByRole('button', { name: 'Column options City' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Show Name' }));
    expect(grid().getAttribute('aria-colcount')).toBe('3');
  });

  it('1,000,000 rows by 30 columns render fewer than 50 rows by 12 columns of cells', () => {
    function Big() {
      const rows = useMemo(
        () => Array.from({ length: 1_000_000 }, (_, i) => i),
        [],
      );
      const [columns] = useState(() =>
        Array.from(
          { length: 30 },
          (_, c): GridColumn<number> => ({
            id: `c${c}`,
            header: `Column ${c}`,
            accessor: (r) => r * 30 + c,
            type: 'number',
            pinned: c === 0 ? 'start' : undefined,
          }),
        ),
      );
      return (
        <DataGrid
          rows={rows}
          columns={columns}
          rowKey={(r) => r}
          ariaLabel="Big"
        />
      );
    }
    render(<Big />);
    const g = grid();
    expect(g.getAttribute('aria-rowcount')).toBe('1000001');
    expect(g.getAttribute('aria-colcount')).toBe('30');
    const bodyRows = screen.getAllByRole('row').length - 1;
    expect(bodyRows).toBeLessThan(50);
    const cells = screen.getAllByRole('gridcell').length;
    expect(cells).toBeLessThan(50 * 12);
    expect(cells / bodyRows).toBeLessThan(12);

    // Scrolling sideways mounts the columns under the viewport and keeps the
    // pinned first column.
    const width = parseFloat(header('Column 1').style.width);
    g.scrollLeft = width * 20;
    fireEvent.scroll(g);
    const firstRow = screen.getAllByRole('row')[1];
    const colIndexes = [...firstRow.querySelectorAll('[role="gridcell"]')].map(
      (c) => Number(c.getAttribute('aria-colindex')),
    );
    expect(colIndexes[0]).toBe(1);
    expect(colIndexes).toContain(22);
    expect(colIndexes).not.toContain(10);
    expect(colIndexes.length).toBeLessThan(12);
  });
});
