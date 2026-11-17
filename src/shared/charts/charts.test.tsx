/** @vitest-environment jsdom */
import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import {
  CynosureTheme,
  swiftChartTheme,
  type ColorMode,
} from '@arshad-shah/cynosure';
import { Bar, THEMES } from '@arshad-shah/swift-chart/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ChartFrame } from './ChartFrame';
import { chartPng } from './export';
import { contextOf, installChartStubs, resetChartStubs } from './testing';
import { useChartTheme } from './theme';

beforeEach(installChartStubs);
afterEach(resetChartStubs);

const rows = [
  { m: 'Jan', v: 3 },
  { m: 'Feb', v: 5 },
];

function Sales({ mode }: { mode: ColorMode }) {
  return (
    <CynosureTheme mode={mode}>
      <Chart />
    </CynosureTheme>
  );
}
function Chart() {
  const theme = useChartTheme();
  return (
    <ChartFrame
      table={{
        caption: 'Sales by month',
        rows,
        getRowId: (r) => r.m,
        columns: [
          { key: 'm', header: 'Month' },
          { key: 'v', header: 'Sales', align: 'end' },
        ],
      }}
    >
      <Bar
        data={rows}
        mapping={{ x: 'm', y: 'v' }}
        theme={theme.name}
        ariaLabel="Sales by month"
      />
    </ChartFrame>
  );
}

/** The colour the chart last drew its text in. */
const ink = () =>
  contextOf(screen.getByRole('img', { name: 'Sales by month' }))
    .calls.filter((c) => c.name === 'fillText')
    .at(-1)?.fillStyle;

describe('swift-chart in tools', () => {
  it('registers the Cynosure palette as a swift-chart theme', () => {
    const { result } = renderHook(() => useChartTheme());
    const { bg, ...rest } = swiftChartTheme(undefined, 'light');
    void bg;
    // Transparent, so the chart sits on its card.
    expect(THEMES[result.current.name]).toMatchObject({
      ...rest,
      bg: 'transparent',
    });
  });

  it('re-themes when the mode changes', () => {
    const { rerender } = render(<Sales mode="light" />);
    expect(ink()).toBe(swiftChartTheme(undefined, 'light').textMuted);
    rerender(<Sales mode="dark" />);
    expect(ink()).toBe(swiftChartTheme(undefined, 'dark').textMuted);
  });

  it('shows the data as a Cynosure table on request', () => {
    render(<Sales mode="light" />);
    expect(screen.queryByRole('table')).toBeNull();
    fireEvent.click(
      screen.getByRole('switch', { name: 'Show the data as a table' }),
    );
    const table = screen.getByRole('table', { name: 'Sales by month' });
    expect(table.textContent).toBe('Sales by monthMonthSalesJan3Feb5');
  });

  it('exports the canvas as a PNG blob', () => {
    expect(chartPng(null)).toBeNull();
    const blob = chartPng({
      chart: null,
      resize: () => {},
      toDataURL: () => 'data:image/png;base64,iVBORw0KGgo=',
    });
    expect(blob?.type).toBe('image/png');
    expect(blob?.size).toBe(8);
  });
});
