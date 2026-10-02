import { describe, expect, it } from 'vitest';
import { evaluateSheet, type SheetOptions } from './engine';

const opts = (o: Partial<SheetOptions> = {}): SheetOptions => ({
  angle: 'deg',
  precision: 14,
  bigNumber: false,
  notation: { thousands: false, sciAbove: 21 },
  ...o,
});

const texts = (lines: string[], o?: Partial<SheetOptions>) =>
  evaluateSheet(lines, opts(o)).results.map((r) =>
    r.ok ? r.text : `error: ${r.error}`,
  );

describe('evaluateSheet', () => {
  it('shares a scope with variables, ans and line references', () => {
    expect(texts(['a = 5', 'a * 2', 'ans + 1', 'line2 / 2'])).toEqual([
      '5',
      '10',
      '11',
      '5',
    ]);
    expect(evaluateSheet(['a = 5'], opts()).scope).toEqual({ a: 5 });
  });
  it('converts units with the precision setting', () => {
    expect(texts(['5 km to mi'])).toEqual(['3.1068559611867 mi']);
    expect(texts(['5 km to mi'], { precision: 4 })).toEqual(['3.107 mi']);
  });
  it('honours the angle mode', () => {
    expect(texts(['sin(30)'])).toEqual(['0.5']);
    expect(texts(['sin(pi / 6)'], { angle: 'rad' })).toEqual(['0.5']);
    expect(texts(['asin(1)'])).toEqual(['90']);
  });
  it('is exact in BigNumber mode', () => {
    const big = { bigNumber: true, precision: 64 };
    expect(texts(['0.1 + 0.2'], big)).toEqual(['0.3']);
    expect(
      texts(['2^200'], {
        ...big,
        notation: { thousands: false, sciAbove: 100 },
      }),
    ).toEqual([(2n ** 200n).toString()]);
    expect(texts(['sin(30)'], big)).toEqual(['0.5']);
    // At the default 14 digits too (guard digits absorb pi/180 rounding).
    expect(texts(['sin(30)'], { bigNumber: true })).toEqual(['0.5']);
  });
  it('keeps going after a line error', () => {
    const r = evaluateSheet(
      ['1 +', '2 * 3', 'nope + 1', 'ans'],
      opts(),
    ).results;
    expect(r[0].ok).toBe(false);
    expect(r[1]).toMatchObject({ ok: true, text: '6' });
    expect(r[2]).toMatchObject({ ok: false });
    expect(r[3]).toMatchObject({ ok: true, text: '6' });
  });
  it('gives comments and blank lines empty results', () => {
    expect(texts(['# note', '// note', '   ', '1+1'])).toEqual([
      '',
      '',
      '',
      '2',
    ]);
  });
  it('formats thousands separators and switches to scientific notation', () => {
    expect(
      texts(['1234567', '1234.5678', '0.000012345', '1e-9'], {
        notation: { thousands: true, sciAbove: 21 },
      }),
    ).toEqual(['1,234,567', '1,234.5678', '0.000012345', '1e-9']);
    expect(
      texts(['1234567'], { notation: { thousands: false, sciAbove: 6 } }),
    ).toEqual(['1.234567e+6']);
  });
  it('describes function definitions and other values', () => {
    expect(texts(['f(x) = x^2', 'f(3)', '[1, 2] * 2', 'sqrt(-4)'])).toEqual([
      'f(x)',
      '9',
      '[2, 4]',
      '2i',
    ]);
  });
  it('clamps the precision to 4 to 64 digits', () => {
    expect(texts(['pi'], { precision: 1 })).toEqual(['3.142']);
  });
});
