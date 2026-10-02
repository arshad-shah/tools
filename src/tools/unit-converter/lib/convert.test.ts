import { describe, expect, it } from 'vitest';
import { convert } from './convert';
import { formatNumber as formatNew } from './format';
import { CATEGORIES as NEW_CATEGORIES, findUnit, getCategory } from './units';

describe('unit definitions', () => {
  const cat = (id: string, basePx?: number) => getCategory(id, { basePx })!;
  const u = (c: string, id: string, basePx?: number) =>
    findUnit(cat(c, basePx), id)!;
  const conv = (c: string, v: number, from: string, to: string, px?: number) =>
    convert(v, u(c, from, px), u(c, to, px));

  it('uses exact factors', () => {
    expect(conv('length', 1, 'mi', 'm')).toBe(1609.344);
    expect(conv('mass', 1, 'lb', 'kg')).toBe(0.45359237);
    expect(conv('data', 1, 'MB', 'B')).toBe(1_000_000);
    expect(conv('data', 1, 'MiB', 'B')).toBe(1_048_576);
  });
  it('keeps tiny values', () => {
    expect(formatNew(conv('energy', 1, 'eV', 'J'))).toBe('1.602176634e-19');
  });
  it('converts temperatures exactly at the common points', () => {
    expect(conv('temperature', 32, 'f', 'c')).toBe(0);
    expect(conv('temperature', -40, 'f', 'c')).toBe(-40);
    expect(conv('temperature', 0, 'c', 'k')).toBe(273.15);
  });
  it('inverts fuel economy', () => {
    const mpg = conv('fuel', 10, 'l100km', 'mpg-us');
    expect(mpg).toBeCloseTo(23.5215, 4);
    expect(conv('fuel', mpg, 'mpg-us', 'l100km')).toBeCloseTo(10, 12);
  });
  it('sizes typography from the base font size', () => {
    expect(conv('typography', 16, 'px', 'rem', 16)).toBe(1);
    expect(conv('typography', 20, 'px', 'rem', 10)).toBe(2);
  });
  it('labels averaged calendar units', () => {
    expect(u('time', 'mo').note).toBe('average Gregorian (30.436875 d)');
  });
  it('has ten new categories alongside the original ten', () => {
    expect(NEW_CATEGORIES.map((c) => c.id)).toEqual(
      expect.arrayContaining([
        'angle',
        'frequency',
        'power',
        'force',
        'torque',
        'fuel',
        'data-rate',
        'density',
        'typography',
        'cooking',
      ]),
    );
    expect(NEW_CATEGORIES).toHaveLength(20);
  });
  it('round-trips every unit within 1e-12 relative', () => {
    // Relative to the larger of the value and its base value, so an offset
    // scale (0.001 K is -273.149 C) is measured against the magnitude it
    // actually passes through.
    for (const c of NEW_CATEGORIES)
      for (const unitDef of c.units)
        for (const x of [1, 123.456, 0.001, -7.5]) {
          const base = unitDef.toBase(x);
          const back = unitDef.fromBase(base);
          const scale = Math.max(Math.abs(x), Math.abs(base));
          expect(Math.abs(back - x) / scale).toBeLessThan(1e-12);
        }
  });
  it('gives unique unit ids within each category', () => {
    for (const c of NEW_CATEGORIES) {
      const ids = c.units.map((x) => x.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids).toContain(c.base);
    }
  });
});
