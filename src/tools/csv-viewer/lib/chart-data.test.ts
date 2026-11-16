import { describe, expect, it } from 'vitest';
import { CHART_POINTS, csvChart, ROW_NUMBER } from './chart-data';

const types = { city: 'text', n: 'integer', d: 'date' } as const;

describe('csvChart', () => {
  it('sums y per category for bars, largest first', () => {
    const c = csvChart(
      [
        { city: 'A', n: 1 },
        { city: 'B', n: 5 },
        { city: 'A', n: 2 },
        { city: null, n: 9 },
      ],
      'bar',
      'city',
      'n',
      types,
    );
    expect(c.rows).toEqual([
      { label: 'B', x: 'B', y: 5 },
      { label: 'A', x: 'A', y: 3 },
    ]);
  });

  it('counts rows when bars have no y column', () => {
    const c = csvChart(
      [{ city: 'A' }, { city: 'A' }],
      'bar',
      'city',
      ROW_NUMBER,
      types,
    );
    expect(c.rows).toEqual([{ label: 'A', x: 'A', y: 2 }]);
  });

  it('downsamples long lines to the point budget over all rows', () => {
    const rows = Array.from({ length: 50_000 }, (_, i) => ({
      n: Math.sin(i / 100),
    }));
    const c = csvChart(rows, 'line', ROW_NUMBER, 'n', types);
    expect(c.rows).toHaveLength(CHART_POINTS);
    expect(c.rows[0]).toEqual({ label: '1', x: 1, y: 0 });
    expect(c.used).toBe(50_000);
    expect(c.reduced).toBe(true);
  });

  it('uses time for date x columns, sorted', () => {
    const c = csvChart(
      [
        { d: '2024-02-01', n: 2 },
        { d: '2024-01-01', n: 1 },
      ],
      'scatter',
      'd',
      'n',
      types,
    );
    expect(c.time).toBe(true);
    expect(c.rows.map((p) => [p.label, p.y])).toEqual([
      ['2024-01-01', 1],
      ['2024-02-01', 2],
    ]);
  });

  it('bins histogram samples, skipping non-numbers', () => {
    const c = csvChart(
      [{ n: 1 }, { n: 'x' }, { n: 3 }, { n: 3 }],
      'histogram',
      '',
      'n',
      types,
    );
    expect(c.used).toBe(3);
    expect(c.rows.reduce((sum, b) => sum + b.y, 0)).toBe(3);
    expect(c.rows[0].label).toMatch(/^1 to /);
  });
});
