/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GridColumn } from './columns';
import { DataGrid } from './data-grid';
import { grid, mockViewport, people, type Person } from './test-utils';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// No explicit widths: the grid sizes the columns itself (6-H).
const cols: GridColumn<Person>[] = [
  { id: 'name', header: 'Name', accessor: (r) => r.name },
  { id: 'age', header: 'Age', accessor: (r) => r.age, type: 'number' },
  { id: 'city', header: 'Size after cleaning', accessor: (r) => r.city },
];

const outer = () => grid().closest('[style*="min-height"]') as HTMLElement;
const headers = () => screen.getAllByRole('columnheader');

describe('DataGrid layout (6-H)', () => {
  it('a table that fits fills the width and never scrolls sideways', () => {
    mockViewport(800, 400);
    render(
      <DataGrid
        rows={people}
        columns={cols}
        rowKey={(r) => r.id}
        ariaLabel="People"
      />,
    );
    const total = headers().reduce((a, h) => a + parseFloat(h.style.width), 0);
    expect(total).toBe(800);
  });

  it('sizes its height to the rows, up to maxRows', () => {
    mockViewport(800, 400);
    const { rerender } = render(
      <DataGrid
        rows={people}
        columns={cols}
        rowKey={(r) => r.id}
        ariaLabel="People"
      />,
    );
    // Header 40 + 4 rows of 32 + borders 2.
    expect(outer().style.height).toBe(`${40 + 4 * 32 + 2}px`);
    const many = Array.from({ length: 40 }, (_, i) => ({
      ...people[0],
      id: i,
    }));
    rerender(
      <DataGrid
        rows={many}
        columns={cols}
        rowKey={(r) => r.id}
        ariaLabel="People"
        maxRows={10}
      />,
    );
    expect(outer().style.height).toBe(`${40 + 10 * 32 + 2}px`);
  });

  it('a caller height caps the grid instead', () => {
    mockViewport(800, 400);
    render(
      <DataGrid
        rows={people}
        columns={cols}
        rowKey={(r) => r.id}
        ariaLabel="People"
        height="min(70vh, 640px)"
      />,
    );
    expect(outer().style.maxHeight).toBe('min(70vh, 640px)');
  });

  it('pins the first column on a phone-width grid', () => {
    mockViewport(360, 400);
    render(
      <DataGrid
        rows={people}
        columns={cols}
        rowKey={(r) => r.id}
        ariaLabel="People"
      />,
    );
    expect(headers()[0].className).toContain('sticky');
  });

  it('shows an empty state with room, not a collapsed box', () => {
    mockViewport(800, 400);
    render(
      <DataGrid
        rows={[]}
        columns={cols}
        rowKey={(r) => r.id}
        ariaLabel="People"
        emptyLabel="No files yet"
      />,
    );
    expect(screen.getByRole('heading', { name: 'No files yet' })).toBeTruthy();
    expect(parseFloat(outer().style.minHeight)).toBeGreaterThan(150);
  });
});
