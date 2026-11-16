/** @vitest-environment jsdom */
import {
  fireEvent,
  render,
  renderHook,
  screen,
  within,
} from '@testing-library/react';
import { useCynosureTheme } from '@arshad-shah/cynosure';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  chartCanvas,
  coloursOf,
  installChartStubs,
  resetChartStubs,
} from '@/shared/charts/testing';
import { Timeline } from './Timeline';

const T0 = Date.UTC(2026, 0, 2, 10, 0, 0);
const histogram = {
  t0: T0,
  t1: T0 + 4 * 60_000,
  counts: { error: [1, 0, 2, 0], info: [3, 4, 0, 1], debug: [0, 1, 0, 0] },
};

describe('Timeline', () => {
  beforeEach(installChartStubs);
  afterEach(resetChartStubs);

  it('colours each level like its badge tone', () => {
    const colors = renderHook(() => useCynosureTheme()).result.current.colors;
    render(
      <Timeline histogram={histogram} range={undefined} onRange={vi.fn()} />,
    );
    const used = coloursOf(chartCanvas('Entries over time by level'));
    // error: danger, info: info, debug (no tone): muted.
    expect(used).toContain(colors.danger);
    expect(used).toContain(colors.info);
    expect(used).toContain(colors.muted);
  });

  it('lists every bucket and level in the data table', () => {
    render(
      <Timeline histogram={histogram} range={undefined} onRange={vi.fn()} />,
    );
    fireEvent.click(
      screen.getByRole('switch', { name: 'Show the data as a table' }),
    );
    const table = screen.getByRole('table', {
      name: 'Entries over time by level',
    });
    const rows = within(table).getAllByRole('row');
    expect(rows[0].textContent).toBe('FromErrorInfoDebug');
    expect(rows[1].textContent).toBe('2026-01-02 10:00:00.000130');
    expect(rows).toHaveLength(5);
  });

  it('the range slider filters to whole buckets and back', () => {
    const onRange = vi.fn();
    const { rerender } = render(
      <Timeline histogram={histogram} range={undefined} onRange={onRange} />,
    );
    const from = screen.getByRole('slider', { name: 'Time range, from' });
    fireEvent.keyDown(from, { key: 'ArrowRight' });
    expect(onRange).toHaveBeenLastCalledWith([T0 + 60_000, T0 + 4 * 60_000]);
    rerender(
      <Timeline
        histogram={histogram}
        range={[T0 + 60_000, T0 + 4 * 60_000]}
        onRange={onRange}
      />,
    );
    expect(screen.getByText(/^Showing 2026-01-02 10:01:00/)).toBeTruthy();
    fireEvent.keyDown(
      screen.getByRole('slider', { name: 'Time range, from' }),
      {
        key: 'Home',
      },
    );
    expect(onRange).toHaveBeenLastCalledWith(undefined);
    fireEvent.click(screen.getByRole('button', { name: 'Clear time range' }));
    expect(onRange).toHaveBeenLastCalledWith(undefined);
  });
});
