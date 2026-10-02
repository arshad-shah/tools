/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Chart } from './chart';
import { freedmanDiaconisWidth, histogram, quantile } from './histogram';
import {
  COLORS,
  contextOf,
  installChartStubs,
  resetChartStubs,
} from './test-utils';
import type { ChartHandle, ChartSeries, HeatmapCell } from './types';

beforeEach(installChartStubs);
afterEach(resetChartStubs);

/** mulberry32: a tiny seeded PRNG. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal samples by Box-Muller over mulberry32. */
function normals(n: number, seed: number): number[] {
  const rand = mulberry32(seed);
  const out: number[] = [];
  while (out.length < n) {
    const u = 1 - rand();
    const v = rand();
    const r = Math.sqrt(-2 * Math.log(u));
    out.push(r * Math.cos(2 * Math.PI * v), r * Math.sin(2 * Math.PI * v));
  }
  return out.slice(0, n);
}

const canvas = (name: string) => screen.getByRole('img', { name });
const fills = (name: string, color: string) =>
  contextOf(canvas(name)).calls.filter(
    (c) => c.name === 'fillRect' && c.fillStyle === color,
  );

describe('histogram', () => {
  const values = normals(1000, 42);
  const sorted = [...values].sort((a, b) => a - b);
  const iqr = quantile(sorted, 0.75) - quantile(sorted, 0.25);
  const fd = (2 * iqr) / Math.cbrt(1000);
  const range = sorted[999] - sorted[0];
  const expected = Math.ceil(range / fd);

  it('bins 1,000 seeded normal samples by Freedman-Diaconis', () => {
    expect(freedmanDiaconisWidth(sorted)).toBeCloseTo(fd, 12);
    const bins = histogram(values, 'auto');
    expect(bins).toHaveLength(expected);
    const width = bins[0].x1 - bins[0].x0;
    expect(width).toBeLessThanOrEqual(fd);
    expect(width).toBeGreaterThan(fd * ((expected - 1) / expected));
    expect(bins[0].x0).toBe(sorted[0]);
    expect(bins.reduce((s, b) => s + b.count, 0)).toBe(1000);
  });

  it('draws one bar per bin', () => {
    const series: ChartSeries[] = [
      { id: 's', label: 'Samples', points: values.map((y, x) => ({ x, y })) },
    ];
    render(<Chart kind="histogram" series={series} ariaLabel="Spread" />);
    expect(fills('Spread', COLORS['--chart-1'])).toHaveLength(expected);
  });

  it('honours a fixed bin count', () => {
    expect(histogram(values, 12)).toHaveLength(12);
  });
});

describe('heatmap', () => {
  it('lays a 12-week calendar out as 12 columns of 7 days', () => {
    // 2026-01-05 is a Monday.
    const cells: HeatmapCell[] = Array.from({ length: 84 }, (_, i) => ({
      x: new Date(2026, 0, 5 + i),
      y: 0,
      value: i % 9,
    }));
    render(
      <Chart kind="heatmap" cells={cells} calendar ariaLabel="Activity" />,
    );
    const rects = contextOf(canvas('Activity')).calls.filter(
      (c) => c.name === 'fillRect',
    );
    expect(rects).toHaveLength(12 * 7);
    const xs = new Set(rects.map((c) => Math.round(c.args[0] as number)));
    const ys = new Set(rects.map((c) => Math.round(c.args[1] as number)));
    expect(xs.size).toBe(12);
    expect(ys.size).toBe(7);
  });
});

const LINES: ChartSeries[] = [
  {
    id: 'a',
    label: 'North',
    points: [0, 1, 2, 3, 4].map((x) => ({ x, y: x * x })),
  },
  {
    id: 'b',
    label: 'South',
    points: [0, 1, 2, 3, 4].map((x) => ({ x, y: 10 - x })),
  },
];

describe('interaction and export', () => {
  it('reports the brushed x range after a drag, and null after a click', () => {
    const onBrush = vi.fn();
    render(
      <Chart kind="line" series={LINES} brush={onBrush} ariaLabel="Sales" />,
    );
    const el = canvas('Sales');
    fireEvent.pointerDown(el, { clientX: 200, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(el, { clientX: 400, clientY: 100, pointerId: 1 });
    expect(
      contextOf(el).calls.some(
        (c) => c.name === 'fillRect' && c.fillStyle === COLORS['--accent'],
      ),
    ).toBe(true);
    fireEvent.pointerUp(el, { clientX: 400, clientY: 100, pointerId: 1 });
    expect(onBrush).toHaveBeenCalledTimes(1);
    const [[range]] = onBrush.mock.calls as [[number, number]][];
    expect(range[0]).toBeGreaterThan(0);
    expect(range[1]).toBeLessThan(4);
    expect(range[1]).toBeGreaterThan(range[0]);

    fireEvent.pointerDown(el, { clientX: 300, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(el, { clientX: 300, clientY: 100, pointerId: 1 });
    expect(onBrush).toHaveBeenLastCalledWith(null);
  });

  it('exports SVG with a path per line series', () => {
    const ref = React.createRef<ChartHandle>();
    render(<Chart ref={ref} kind="line" series={LINES} ariaLabel="Sales" />);
    const svg = ref.current!.exportSvg();
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.match(/<path /g)).toHaveLength(2);
    expect(svg).toContain(COLORS['--chart-2']);
  });

  it('exports PNG from the canvas', async () => {
    const ref = React.createRef<ChartHandle>();
    render(<Chart ref={ref} kind="bar" series={LINES} ariaLabel="Sales" />);
    const blob = new Blob(['png'], { type: 'image/png' });
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb) =>
      cb(blob),
    );
    await expect(ref.current!.exportPng()).resolves.toBe(blob);
  });

  it('zooms from the keyboard and resets with 0', () => {
    render(<Chart kind="line" series={LINES} zoomable ariaLabel="Sales" />);
    const group = screen.getByRole('group', { name: 'Sales zoom and pan' });
    expect(group.tabIndex).toBe(0);
    expect(screen.queryByRole('button', { name: 'Reset zoom' })).toBeNull();
    fireEvent.keyDown(group, { key: '+' });
    expect(screen.getByRole('button', { name: 'Reset zoom' })).toBeTruthy();
    fireEvent.keyDown(group, { key: '0' });
    expect(screen.queryByRole('button', { name: 'Reset zoom' })).toBeNull();
  });

  it('zooms about the cursor on wheel', () => {
    render(<Chart kind="line" series={LINES} zoomable ariaLabel="Sales" />);
    const el = canvas('Sales');
    const ev = new WheelEvent('wheel', {
      deltaY: -100,
      clientX: 300,
      clientY: 100,
      cancelable: true,
    });
    fireEvent(el, ev);
    expect(ev.defaultPrevented).toBe(true);
    expect(screen.getByRole('button', { name: 'Reset zoom' })).toBeTruthy();
  });

  it('plots functions with breaks at poles and reports hover', () => {
    const onHover = vi.fn();
    render(
      <Chart
        kind="function"
        fns={[{ id: 't', label: 'tan', fn: Math.tan }]}
        xDomain={[-3, 3]}
        onPointHover={onHover}
        ariaLabel="Tangent"
      />,
    );
    const calls = contextOf(canvas('Tangent')).calls.filter(
      (c) => c.strokeStyle === COLORS['--chart-1'] && c.name === 'moveTo',
    );
    // Three branches of tan over [-3, 3].
    expect(calls).toHaveLength(3);
    fireEvent.pointerMove(canvas('Tangent'), {
      clientX: 300,
      clientY: 100,
      pointerId: 1,
    });
    expect(onHover).toHaveBeenCalledWith(
      expect.objectContaining({ seriesId: 't' }),
    );
    expect(screen.getByTestId('chart-tooltip').textContent).toContain('tan');
  });
});
