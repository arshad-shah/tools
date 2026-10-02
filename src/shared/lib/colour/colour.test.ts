import { describe, expect, it } from 'vitest';
import {
  apcaLc,
  contrastRatio,
  formatColor,
  gamutMap,
  inGamut,
  nearestNamed,
  parseColor,
  scale,
  simulateCvd,
  suggestPassing,
  toOklch,
  wcagLevels,
  type Color,
} from './index';

const hex = (h: string) => parseColor(h);
const close = (a: Color, b: Color, tol: number) => {
  expect(Math.abs(a.r - b.r)).toBeLessThanOrEqual(tol);
  expect(Math.abs(a.g - b.g)).toBeLessThanOrEqual(tol);
  expect(Math.abs(a.b - b.b)).toBeLessThanOrEqual(tol);
};

describe('contrast', () => {
  it('matches WCAG reference ratios', () => {
    expect(contrastRatio(hex('#000'), hex('#fff'))).toBeCloseTo(21, 10);
    expect(contrastRatio(hex('#777'), hex('#fff')).toFixed(2)).toBe('4.48');
    expect(contrastRatio(hex('#fff'), hex('#777'))).toBeCloseTo(
      contrastRatio(hex('#777'), hex('#fff')),
      10,
    );
  });
  it('composites a translucent foreground', () => {
    expect(contrastRatio(hex('#00000000'), hex('#fff'))).toBeCloseTo(1, 10);
  });
  it('reports WCAG levels', () => {
    expect(wcagLevels(4.48)).toEqual({
      normalAA: false,
      normalAAA: false,
      largeAA: true,
      largeAAA: false,
      uiAA: true,
    });
    expect(wcagLevels(7).normalAAA).toBe(true);
  });
  it('matches published APCA Lc values', () => {
    expect(apcaLc(hex('#000'), hex('#fff'))).toBeCloseTo(106.04, 1);
    expect(apcaLc(hex('#fff'), hex('#000'))).toBeCloseTo(-107.88, 1);
    expect(apcaLc(hex('#888'), hex('#fff'))).toBeCloseTo(63.06, 1);
    expect(apcaLc(hex('#fff'), hex('#fff'))).toBe(0);
  });
  it('suggests the smallest lightness change that passes', () => {
    const fg = hex('#999');
    const out = suggestPassing(fg, hex('#fff'), 4.5, 'fg');
    expect(out).not.toBeNull();
    expect(contrastRatio(out!, hex('#fff'))).toBeGreaterThanOrEqual(4.5);
    expect(Math.abs(toOklch(out!).l - toOklch(fg).l)).toBeLessThan(0.12);
    expect(suggestPassing(hex('#777'), hex('#777'), 22, 'fg')).toBeNull();
  });
});

describe('parse and format', () => {
  it('reads oklch() as sRGB', () => {
    close(parseColor('oklch(62.8% 0.2577 29.23)'), hex('#ff0000'), 1 / 255);
  });
  it('reads every syntax for the same red', () => {
    for (const text of [
      '#f00',
      '#ff0000ff',
      'red',
      'RGB(255, 0, 0)',
      'rgb(100% 0% 0%)',
      'rgba(255 0 0 / 1)',
      'hsl(0 100% 50%)',
      'hsl(0deg, 100%, 50%)',
      'hsla(1turn 100% 50%)',
      'hwb(0 0% 0%)',
      'lab(54.29 80.8 69.89)',
      'lch(54.29 106.84 40.85)',
      'oklab(0.628 0.2249 0.1258)',
    ])
      close(parseColor(text), hex('#ff0000'), 1.5 / 255);
  });
  it('reads alpha and transparent', () => {
    expect(parseColor('rgb(0 0 0 / 50%)').alpha).toBe(0.5);
    expect(parseColor('#0000').alpha).toBe(0);
    expect(parseColor('transparent')).toEqual({ r: 0, g: 0, b: 0, alpha: 0 });
  });
  it('names the problem with invalid input', () => {
    expect(() => parseColor('rgb(1,2)')).toThrow('rgb() needs 3 values');
    expect(() => parseColor('#12345')).toThrow(/3, 4, 6 or 8/);
    expect(() => parseColor('hsl(a b c)')).toThrow(/invalid value "a"/);
    expect(() => parseColor('blurple')).toThrow(/not a colour/);
    expect(() => parseColor('foo(1 2 3)')).toThrow(/Unknown colour function/);
    expect(() => parseColor('rgb(1 2 3)')).not.toThrow();
  });
  it('formats every notation', () => {
    const red = hex('#ff0000');
    expect(formatColor(red, 'hex')).toBe('#ff0000');
    expect(formatColor(red, 'rgb')).toBe('rgb(255 0 0)');
    expect(formatColor(red, 'hsl')).toBe('hsl(0 100% 50%)');
    expect(formatColor(red, 'hwb')).toBe('hwb(0 0% 0%)');
    expect(formatColor(red, 'oklch')).toBe('oklch(62.8% 0.2577 29.23)');
    expect(formatColor(red, 'oklab')).toMatch(
      /^oklab\(0\.628 0\.22\d+ 0\.12\d+\)$/,
    );
    expect(formatColor(red, 'lab')).toMatch(/^lab\(54\.2\d /);
    expect(formatColor(red, 'lch')).toMatch(
      /^lch\(54\.2\d 106\.8\d 40\.8\d\)$/,
    );
    expect(formatColor({ ...red, alpha: 0.5 }, 'hex')).toBe('#ff000080');
    expect(formatColor({ ...red, alpha: 0.5 }, 'rgb')).toBe(
      'rgb(255 0 0 / 0.5)',
    );
  });
  it('round-trips hex through OKLCH for 50 seeded colours', () => {
    let x = 7;
    const next = () => {
      x = (x * 1_103_515_245 + 12_345) % 2_147_483_648;
      return (x >> 8) & 0xff;
    };
    for (let i = 0; i < 50; i++) {
      const c: Color = {
        r: next() / 255,
        g: next() / 255,
        b: next() / 255,
        alpha: 1,
      };
      const back = parseColor(formatColor(c, 'oklch'));
      close(back, c, 1 / 255);
      expect(formatColor(back, 'hex')).toBe(formatColor(c, 'hex'));
    }
  });
});

describe('gamut, CVD, scales and names', () => {
  it('maps out-of-gamut colours into sRGB keeping lightness and hue', () => {
    const wide = parseColor('oklch(70% 0.4 150)');
    expect(inGamut(wide)).toBe(false);
    const mapped = gamutMap(wide);
    expect(inGamut(mapped)).toBe(true);
    const a = toOklch(mapped);
    expect(a.l).toBeCloseTo(0.7, 1);
    expect(Math.abs(a.h - 150)).toBeLessThan(3);
  });
  it('simulates deuteranopia and protanopia with the Machado matrices', () => {
    const red = hex('#ff0000');
    close(simulateCvd(red, 'deutan'), hex('rgb(163 144 0)'), 2 / 255);
    close(simulateCvd(red, 'protan'), hex('rgb(109 95 0)'), 2 / 255);
    close(simulateCvd(red, 'deutan', 0), red, 1e-9);
    const grey = simulateCvd(hex('#3a7'), 'achroma');
    expect(grey.r).toBeCloseTo(grey.g, 9);
    expect(grey.g).toBeCloseTo(grey.b, 9);
  });
  it('builds a monotonic, in-gamut scale', () => {
    const s = scale(hex('#3b82f6'));
    const ls = Object.keys(s)
      .map(Number)
      .sort((a, b) => a - b)
      .map((k) => toOklch(s[k]).l);
    expect(ls).toHaveLength(11);
    for (let i = 1; i < ls.length; i++) expect(ls[i]).toBeLessThan(ls[i - 1]);
    for (const c of Object.values(s)) expect(inGamut(c)).toBe(true);
    expect(
      Math.abs(toOklch(s[500]).h - toOklch(hex('#3b82f6')).h),
    ).toBeLessThan(3);
  });
  it('finds the nearest named colour', () => {
    expect(nearestNamed(hex('#fe0000')).name).toBe('red');
    expect(nearestNamed(hex('#663399'))).toEqual({
      name: 'rebeccapurple',
      distance: 0,
    });
  });
});
