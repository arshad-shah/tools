import _ from 'lodash';
import type { ChartPoint, ParsedData, SortDirection } from '../types';

export const ROWS_PER_PAGE_OPTIONS = [
  { value: '5', label: '5 rows' },
  { value: '10', label: '10 rows' },
  { value: '25', label: '25 rows' },
  { value: '50', label: '50 rows' },
  { value: '100', label: '100 rows' },
];

/** How many rows the chart plots. */
export const CHART_ROW_LIMIT = 50;

/** Case-insensitive "contains" filter on one column; no-op without both. */
export function filterRows(
  data: ParsedData[],
  column: string,
  value: string,
): ParsedData[] {
  if (!column || !value) return data;
  return data.filter((row) => {
    const v = row[column];
    if (v === null || v === undefined) return false;
    return String(v).toLowerCase().includes(value.toLowerCase());
  });
}

export function sortRows(
  data: ParsedData[],
  column: string,
  direction: SortDirection,
): ParsedData[] {
  if (!column) return data;
  return _.orderBy(data, [column], [direction]);
}

/** One 1-based page of rows. */
export function paginate<T>(rows: T[], page: number, perPage: number): T[] {
  const start = (page - 1) * perPage;
  return rows.slice(start, start + perPage);
}

/**
 * Points for the first CHART_ROW_LIMIT rows. Cells that are not finite
 * numbers (text such as a kept-as-text ID, null, NaN) are skipped rather than
 * passed off as numbers; each point keeps its 1-based row position.
 */
export function chartPoints(rows: ParsedData[], column: string): ChartPoint[] {
  if (!rows.length || !column) return [];
  const points: ChartPoint[] = [];
  rows.slice(0, CHART_ROW_LIMIT).forEach((row, i) => {
    const value = row[column];
    if (typeof value === 'number' && Number.isFinite(value)) {
      points.push({ index: i + 1, value });
    }
  });
  return points;
}
