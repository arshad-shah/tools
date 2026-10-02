import { describe, expect, it } from 'vitest';
import type { MockField } from '@/shared/lib/data-formats/mock-schema';
import { generateMock } from './engine';

const column = (field: MockField, count: number, seed = 'opts') =>
  generateMock(
    { tables: [{ name: 't', fields: [field] }] },
    { count, seed, locale: 'en-US' },
  ).t.map((r) => r[field.name]);

describe('field options', () => {
  it('nullablePct 100 gives all null and 0 gives none', () => {
    expect(column({ name: 'a', type: 'int', nullablePct: 100 }, 200)).toEqual(
      new Array(200).fill(null),
    );
    expect(
      column({ name: 'a', type: 'int', nullablePct: 0 }, 200).includes(null),
    ).toBe(false);
  });

  it('keeps the legacy optional flag at about 20% null', () => {
    const v = column({ name: 'a', type: 'int', required: false }, 5000);
    const nulls = v.filter((x) => x === null).length / v.length;
    expect(Math.abs(nulls - 0.2)).toBeLessThan(0.03);
  });

  it('draws a weighted enum within 5% over 10k draws', () => {
    const v = column(
      {
        name: 'plan',
        type: 'enum',
        enum: [
          { value: 'free', weight: 7 },
          { value: 'pro', weight: 2 },
          { value: 'team', weight: 1 },
        ],
      },
      10_000,
    );
    const share = (x: string) => v.filter((y) => y === x).length / v.length;
    expect(Math.abs(share('free') - 0.7)).toBeLessThan(0.05);
    expect(Math.abs(share('pro') - 0.2)).toBeLessThan(0.05);
    expect(Math.abs(share('team') - 0.1)).toBeLessThan(0.05);
  });

  it('honours min, max and precision', () => {
    for (const n of column({ name: 'n', type: 'int', min: 10, max: 20 }, 500)) {
      expect(n).toBeGreaterThanOrEqual(10);
      expect(n).toBeLessThanOrEqual(20);
    }
    for (const n of column(
      { name: 'f', type: 'float', min: 0, max: 1, precision: 3 },
      200,
    ) as number[])
      expect(Math.round(n * 1000) / 1000).toBe(n);
  });

  it('keeps dates in range', () => {
    for (const d of column(
      { name: 'd', type: 'date', dateFrom: '2024-01-01', dateTo: '2024-01-31' },
      200,
    ))
      expect(d).toMatch(/^2024-01-(0[1-9]|[12]\d|3[01])$/);
  });

  it('makes unique values', () => {
    const v = column(
      { name: 'id', type: 'int', min: 1, max: 100, unique: true },
      100,
    );
    expect(new Set(v).size).toBe(100);
  });

  it('reports a unique column that cannot be filled', () => {
    expect(() =>
      column(
        { name: 'email', type: 'int', min: 1, max: 812, unique: true },
        1000,
      ),
    ).toThrow(
      expect.objectContaining({
        code: 'INVALID_INPUT',
        message:
          'Could not make 1000 unique values for email (only 812 possible)',
      }),
    );
  });
});
