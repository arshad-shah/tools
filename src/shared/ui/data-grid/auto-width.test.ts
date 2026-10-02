import { describe, expect, it } from 'vitest';
import {
  AUTO_MAX,
  AUTO_MIN,
  HEADER_CHROME,
  autoWidths,
  headerMinWidth,
  naturalWidth,
  type Measure,
} from './auto-width';
import type { GridColumn } from './columns';

// 8 px per character, any role: easy arithmetic.
const measure: Measure = (t) => t.length * 8;
type Row = Record<string, string>;
const col = (
  id: string,
  header: string,
  extra: Partial<GridColumn<Row>> = {},
) => ({ id, header, accessor: (r: Row) => r[id], ...extra }) as GridColumn<Row>;

describe('DataGrid auto widths', () => {
  it('a header always fits in full with its controls', () => {
    const c = col('size', 'Size after cleaning');
    expect(headerMinWidth(c, measure)).toBe(19 * 8 + HEADER_CHROME);
    // Short content never squeezes the header to a letter.
    expect(naturalWidth(c, [{ size: '1 KB' }], measure)).toBe(
      19 * 8 + HEADER_CHROME,
    );
  });

  it('content widths come from sampled rows, clamped', () => {
    const c = col('n', 'N');
    expect(naturalWidth(c, [{ n: '' }], measure)).toBe(
      Math.max(AUTO_MIN, 1 * 8 + HEADER_CHROME),
    );
    const long = { n: 'x'.repeat(200) };
    expect(naturalWidth(c, [long], measure)).toBe(AUTO_MAX);
  });

  it('only the first 50 rows are sampled', () => {
    const rows: Row[] = Array.from({ length: 60 }, () => ({ v: 'ab' }));
    rows[55] = { v: 'x'.repeat(30) };
    expect(naturalWidth(col('v', 'V'), rows, measure)).toBe(
      Math.max(AUTO_MIN, 8 + HEADER_CHROME),
    );
  });

  it('shares spare room among auto columns so a small table fits', () => {
    const cols = [col('a', 'Name'), col('b', 'Type', { width: 100 })];
    const w = autoWidths(cols, [{ a: 'x', b: 'y' }], 600, measure);
    expect(w[1]).toBe(100);
    expect(w[0] + w[1]).toBe(600);
  });

  it('never shrinks below natural widths when the table is wider than the room', () => {
    const cols = [
      col('a', 'A long header label'),
      col('b', 'Another long one'),
    ];
    const w = autoWidths(cols, [], 100, measure);
    expect(w[0]).toBe(headerMinWidth(cols[0], measure));
    expect(w[1]).toBe(headerMinWidth(cols[1], measure));
  });

  it('keeps explicit and resized widths', () => {
    const cols = [col('a', 'A', { width: 250 }), col('b', 'B', { width: 90 })];
    expect(autoWidths(cols, [], 1000, measure)).toEqual([250, 90]);
  });
});
