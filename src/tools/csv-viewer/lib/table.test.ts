import { describe, expect, it } from 'vitest';
import {
  CHART_ROW_LIMIT,
  chartPoints,
  filterRows,
  paginate,
  sortRows,
} from './table';

describe('filterRows', () => {
  const rows = [{ c: 'New York' }, { c: 'Boston' }, { c: null }, { c: 42 }];

  it('keeps rows whose cell contains the value, case-insensitively', () => {
    expect(filterRows(rows, 'c', 'NEW')).toEqual([{ c: 'New York' }]);
    expect(filterRows(rows, 'c', '4')).toEqual([{ c: 42 }]);
  });

  it('drops null and undefined cells', () => {
    expect(filterRows(rows, 'c', 'o')).toEqual([
      { c: 'New York' },
      { c: 'Boston' },
    ]);
    expect(filterRows([{}], 'c', 'x')).toEqual([]);
  });

  it('returns the rows untouched when the column or value is empty', () => {
    expect(filterRows(rows, '', 'x')).toBe(rows);
    expect(filterRows(rows, 'c', '')).toBe(rows);
  });
});

describe('sortRows', () => {
  it('sorts by a column in either direction', () => {
    expect(sortRows([{ n: 2 }, { n: 1 }], 'n', 'asc')).toEqual([
      { n: 1 },
      { n: 2 },
    ]);
    expect(sortRows([{ n: 1 }, { n: 3 }, { n: 2 }], 'n', 'desc')).toEqual([
      { n: 3 },
      { n: 2 },
      { n: 1 },
    ]);
  });

  it('returns the rows untouched without a sort column', () => {
    const rows = [{ n: 2 }, { n: 1 }];
    expect(sortRows(rows, '', 'asc')).toBe(rows);
  });
});

describe('paginate', () => {
  it('returns the requested 1-based page', () => {
    expect(paginate([1, 2, 3, 4, 5], 2, 2)).toEqual([3, 4]);
    expect(paginate([1, 2, 3, 4, 5], 3, 2)).toEqual([5]);
    expect(paginate([1, 2, 3], 4, 2)).toEqual([]);
  });
});

describe('chartPoints', () => {
  it('maps the first 50 rows to 1-based {index, value} points', () => {
    const rows = Array.from({ length: 60 }, (_v, i) => ({ v: i * 2 }));
    const points = chartPoints(rows, 'v');
    expect(points).toHaveLength(50);
    expect(points[0]).toEqual({ index: 1, value: 0 });
    expect(points[49]).toEqual({ index: 50, value: 98 });
  });

  it('skips cells that are not finite numbers and keeps row positions', () => {
    expect(
      chartPoints(
        [
          { v: 1 },
          { v: 'x' },
          { v: Number.NaN },
          { v: null },
          { v: '7' },
          { v: 3 },
        ],
        'v',
      ),
    ).toEqual([
      { index: 1, value: 1 },
      { index: 6, value: 3 },
    ]);
  });

  it('applies the row limit before skipping non-numeric cells', () => {
    const rows = [
      { v: 'header-ish' },
      ...Array.from({ length: 59 }, () => ({ v: 1 })),
    ];
    const points = chartPoints(rows, 'v');
    expect(points).toHaveLength(CHART_ROW_LIMIT - 1);
    expect(points[0].index).toBe(2);
  });

  it('is empty without rows or a column', () => {
    expect(chartPoints([], 'v')).toEqual([]);
    expect(chartPoints([{ v: 1 }], '')).toEqual([]);
  });
});
