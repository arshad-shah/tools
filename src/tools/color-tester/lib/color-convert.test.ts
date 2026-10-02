import { describe, expect, it } from 'vitest';
import { calculateHSL, hexToRgb, hslToRgb } from './color-convert';

describe('hexToRgb', () => {
  it('parses #rrggbb', () => {
    expect(hexToRgb('#ff8000')).toEqual({ r: 255, g: 128, b: 0 });
    expect(hexToRgb('#4682b4')).toEqual({ r: 70, g: 130, b: 180 });
  });
});

describe('calculateHSL', () => {
  it('returns unrounded h in degrees and s/l in percent', () => {
    expect(calculateHSL(255, 0, 0)).toEqual({ h: 0, s: 100, l: 50 });
    expect(calculateHSL(0, 255, 0)).toEqual({ h: 120, s: 100, l: 50 });
    expect(calculateHSL(0, 0, 255)).toEqual({ h: 240, s: 100, l: 50 });
    expect(calculateHSL(128, 128, 128)).toEqual({
      h: 0,
      s: 0,
      l: (128 / 255) * 100,
    });
    const steel = calculateHSL(70, 130, 180);
    expect(steel.h).toBeCloseTo(207.27, 2);
    expect(steel.s).toBeCloseTo(44, 0);
    expect(steel.l).toBeCloseTo(49.02, 2);
  });
});

describe('hslToRgb', () => {
  it('returns rounded 0-255 channels', () => {
    expect(hslToRgb(0, 100, 50)).toEqual({ r: 255, g: 0, b: 0 });
    expect(hslToRgb(120, 100, 50)).toEqual({ r: 0, g: 255, b: 0 });
    expect(hslToRgb(240, 100, 25)).toEqual({ r: 0, g: 0, b: 128 });
  });

  it('is grey when saturation is 0', () => {
    expect(hslToRgb(200, 0, 50)).toEqual({ r: 128, g: 128, b: 128 });
  });

  it('round-trips through calculateHSL', () => {
    const { h, s, l } = calculateHSL(70, 130, 180);
    expect(hslToRgb(h, s, l)).toEqual({ r: 70, g: 130, b: 180 });
  });
});
