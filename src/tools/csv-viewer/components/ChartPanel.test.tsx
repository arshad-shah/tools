/** @vitest-environment jsdom */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  chartCanvas,
  installChartStubs,
  resetChartStubs,
  textsOf,
} from '@/shared/charts/testing';
import { ChartPanel } from './ChartPanel';

const saved = vi.hoisted(() => ({ files: [] as string[] }));
vi.mock('@/shared/lib/download', () => ({
  saveBlob: (_b: Blob, name: string) => saved.files.push(name),
}));

const rows = [
  { city: 'Cork', n: 3 },
  { city: 'Dublin', n: 9 },
  { city: 'Cork', n: 4 },
  { city: 'Galway', n: 1 },
];
const types = { city: 'text', n: 'integer' } as const;

function mount() {
  return render(
    <ChartPanel
      rows={rows}
      columns={['city', 'n']}
      types={types}
      name="towns.csv"
    />,
  );
}

describe('ChartPanel', () => {
  beforeEach(() => {
    saved.files = [];
    installChartStubs();
  });
  afterEach(resetChartStubs);

  it('draws a line of y by row number with its data table', () => {
    mount();
    const canvas = screen.getByRole('img', { name: 'Line chart of n' });
    // Row numbers label the x axis.
    expect(textsOf(canvas)).toEqual(expect.arrayContaining(['1', '4']));
    fireEvent.click(
      screen.getByRole('switch', { name: 'Show the data as a table' }),
    );
    const table = screen.getByRole('table', { name: 'Line chart of n' });
    expect(
      within(table)
        .getAllByRole('row')
        .map((r) => r.textContent),
    ).toEqual(['Row numbern', '13', '29', '34', '41']);
  });

  it('a bar chart sums y per category, largest first', () => {
    mount();
    fireEvent.click(screen.getByRole('combobox', { name: 'Chart' }));
    fireEvent.click(screen.getByRole('option', { name: 'Bar' }));
    expect(chartCanvas('Bar chart of n')).toBeTruthy();
    fireEvent.click(
      screen.getByRole('switch', { name: 'Show the data as a table' }),
    );
    const cells = within(screen.getByRole('table', { name: 'Bar chart of n' }))
      .getAllByRole('row')
      .slice(1)
      .map((r) => r.textContent);
    expect(cells).toEqual(['Dublin9', 'Cork7', 'Galway1']);
  });

  it('the shown range slider zooms to a stretch of points', () => {
    mount();
    fireEvent.click(
      screen.getByRole('switch', { name: 'Show the data as a table' }),
    );
    const from = screen.getByRole('slider', { name: 'Shown range, from' });
    fireEvent.keyDown(from, { key: 'ArrowRight' });
    fireEvent.keyDown(from, { key: 'ArrowRight' });
    const table = screen.getByRole('table', { name: 'Line chart of n' });
    expect(within(table).getAllByRole('row')).toHaveLength(3);
  });

  it('downloads the chart as a PNG', () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Download PNG' }));
    expect(saved.files).toEqual(['towns-chart.png']);
  });
});
