/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GridColumn } from './columns';
import { DataGrid } from './data-grid';
import {
  AUTO_MAX,
  estimateMeasure,
  HEADER_HEIGHT,
  headerMinWidth,
} from './sizing';
import { grid, mockViewport, people, type Person } from './test-utils';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const columns: GridColumn<Person>[] = [
  { id: 'name', header: 'Name', accessor: (r) => r.name },
  { id: 'age', header: 'Age', accessor: (r) => r.age, type: 'number' },
  { id: 'city', header: 'Size before', accessor: (r) => r.city, width: 20 },
];

const root = () => grid().parentElement as HTMLElement;
const headerCell = (name: string) =>
  screen
    .getAllByRole('columnheader')
    .find(
      (h) => h.querySelector('[data-grid-header-label]')?.textContent === name,
    ) as HTMLElement;
const widthOf = (name: string) => parseFloat(headerCell(name).style.width);

function renderGrid(rows: Person[], extra: { height?: number } = {}) {
  return render(
    <DataGrid
      rows={rows}
      columns={columns}
      rowKey={(r) => r.id}
      ariaLabel="People"
      {...extra}
    />,
  );
}

describe('DataGrid sizing', () => {
  it('sizes its height to the rows, header included', () => {
    mockViewport(1440);
    renderGrid(people);
    expect(root().style.height).toBe(`${HEADER_HEIGHT + 4 * 32 + 2}px`);
    expect(root().style.minHeight).toBe(`${HEADER_HEIGHT + 32 + 2}px`);
  });

  it('stops growing at 12 rows and scrolls inside', () => {
    mockViewport(1440);
    const many = Array.from({ length: 100 }, (_, i) => ({
      ...people[0],
      id: i,
    }));
    renderGrid(many);
    expect(root().style.height).toBe(`${HEADER_HEIGHT + 12 * 32 + 2}px`);
  });

  it('keeps room for the header and one row when empty', () => {
    mockViewport(1440);
    renderGrid([]);
    expect(root().style.height).toBe(`${HEADER_HEIGHT + 32 + 2}px`);
    expect(screen.getByText('No rows')).toBeTruthy();
  });

  it('a fixed height overrides the auto height', () => {
    mockViewport(1440);
    renderGrid(people, { height: 300 });
    expect(root().style.height).toBe('300px');
  });

  it('never makes a column narrower than its full header label and icons', () => {
    mockViewport(1440);
    renderGrid(people);
    expect(widthOf('Size before')).toBe(
      headerMinWidth(columns[2], estimateMeasure),
    );
    expect(widthOf('Age')).toBeGreaterThanOrEqual(
      headerMinWidth(columns[1], estimateMeasure),
    );
  });

  it('auto-sized columns fill the viewport', () => {
    mockViewport(1440);
    renderGrid(people);
    const total = ['Name', 'Age', 'Size before']
      .map(widthOf)
      .reduce((a, b) => a + b, 0);
    expect(total).toBe(1440);
  });

  it('pins the first column below 480 px', () => {
    mockViewport(390);
    renderGrid(people);
    expect(headerCell('Name').className).toContain('sticky');
    expect(headerCell('Age').className).not.toContain('sticky');
  });

  it('double-click on the resize handle fits the column to its content', () => {
    mockViewport(1440);
    const long = people.map((p) => ({ ...p, city: 'x'.repeat(90) }));
    renderGrid(long);
    const before = widthOf('Size before');
    fireEvent.doubleClick(
      screen.getByRole('separator', { name: 'Resize Size before' }),
    );
    const after = widthOf('Size before');
    expect(after).toBeGreaterThan(before);
    expect(after).toBeGreaterThan(AUTO_MAX);
    expect(after).toBe(Math.ceil(estimateMeasure('x'.repeat(90), 'cell') + 25));
  });

  it('header icons reveal on hover or focus and stay on for touch', () => {
    mockViewport(1440);
    renderGrid(people);
    const filter = screen.getByRole('button', { name: 'Filter Name' });
    const menu = screen.getByRole('button', { name: 'Column options Name' });
    for (const b of [filter, menu]) {
      expect(b.className).toContain('opacity-0');
      expect(b.className).toContain('group-hover:opacity-100');
      expect(b.className).toContain('group-focus-within:opacity-100');
      expect(b.className).toContain('[@media(hover:none)]:opacity-100');
    }
  });

  it('a clipped cell shows its full text as a tooltip', () => {
    mockViewport(1440);
    renderGrid(people);
    const span = screen.getByText('London');
    vi.spyOn(span, 'scrollWidth', 'get').mockReturnValue(200);
    vi.spyOn(span, 'clientWidth', 'get').mockReturnValue(100);
    fireEvent.pointerEnter(span);
    expect(span.title).toBe('London');
    const other = screen.getByText('Boston');
    fireEvent.pointerEnter(other);
    expect(other.title).toBe('');
  });
});

describe('DataGrid column mounting', () => {
  it('mounts every column of a small grid, even past the viewport', () => {
    mockViewport(390);
    const wide: GridColumn<Person>[] = Array.from({ length: 8 }, (_, i) => ({
      id: `c${i}`,
      header: `Column number ${i}`,
      accessor: (r) => `${r.name} ${i}`,
    }));
    render(
      <DataGrid
        rows={people}
        columns={wide}
        rowKey={(r) => r.id}
        ariaLabel="Wide"
      />,
    );
    expect(screen.getAllByRole('columnheader')).toHaveLength(8);
    expect(screen.getByText('Ada 7')).toBeTruthy();
  });
});
