/** @vitest-environment jsdom */
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Chart } from './chart';
import {
  COLORS,
  contextOf,
  installChartStubs,
  resetChartStubs,
} from './test-utils';
import type { ChartSeries } from './types';

beforeEach(installChartStubs);
afterEach(resetChartStubs);

const SERIES: ChartSeries[] = [
  {
    id: 'a',
    label: 'Requests',
    points: [
      { x: 0, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: null },
      { x: 3, y: 4 },
      { x: 4, y: 5 },
    ],
  },
  {
    id: 'b',
    label: 'Errors',
    points: [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 0 },
      { x: 4, y: 2 },
    ],
  },
];

const canvas = () => screen.getByRole('img', { name: 'Traffic' });

describe('Chart', () => {
  it('is an image named by ariaLabel and described by the summary', () => {
    render(
      <Chart
        kind="line"
        series={SERIES}
        ariaLabel="Traffic"
        ariaSummary="Requests rise from 1 to 5"
      />,
    );
    expect(canvas().tagName).toBe('CANVAS');
    expect(canvas().getAttribute('aria-label')).toBe('Traffic');
    const id = canvas().getAttribute('aria-describedby')!;
    expect(document.getElementById(id)?.textContent).toBe(
      'Requests rise from 1 to 5',
    );
  });

  it('shows the data as a table behind the toggle', () => {
    render(<Chart kind="line" series={SERIES} ariaLabel="Traffic" />);
    expect(screen.queryByRole('table')).toBeNull();
    fireEvent.click(screen.getByRole('switch', { name: 'Show data table' }));
    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(6);
    expect(
      within(rows[0])
        .getAllByRole('columnheader')
        .map((c) => c.textContent),
    ).toEqual(['X', 'Requests', 'Errors']);
    expect(within(rows[3]).getAllByRole('cell')[0].textContent).toBe(
      'No value',
    );
  });

  it('repaints with the new colours when the theme changes', async () => {
    render(<Chart kind="line" series={SERIES} ariaLabel="Traffic" />);
    const ctx = contextOf(canvas());
    const clears = () => ctx.calls.filter((c) => c.name === 'clearRect').length;
    const before = clears();
    expect(before).toBeGreaterThan(0);
    await act(async () => {
      document.documentElement.style.setProperty('--chart-1', '#abcdef');
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    await waitFor(() => expect(clears()).toBeGreaterThan(before));
    expect(ctx.calls.some((c) => c.strokeStyle === '#abcdef')).toBe(true);
  });

  it('breaks the line at a null point', () => {
    render(<Chart kind="line" series={SERIES} ariaLabel="Traffic" />);
    const path = contextOf(canvas())
      .calls.filter(
        (c) =>
          c.strokeStyle === COLORS['--chart-1'] &&
          (c.name === 'moveTo' || c.name === 'lineTo'),
      )
      .map((c) => c.name);
    expect(path).toEqual(['moveTo', 'lineTo', 'moveTo', 'lineTo']);
  });

  it('lists the series in the legend', () => {
    render(<Chart kind="bar" series={SERIES} ariaLabel="Traffic" />);
    const items = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(items).toEqual(['Requests', 'Errors']);
  });
});
