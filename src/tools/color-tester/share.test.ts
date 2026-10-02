import { describe, expect, it } from 'vitest';
import { parseColorShare } from './share';

const ok = {
  colors: { base: '#3b82f6', fg: 'oklch(0.3 0.02 250)', bg: 'white' },
  palette: ['#ff0000', 'rgb(0 0 255)'],
  scale: { hueShift: 10, chromaCurve: 0.5 },
};

describe('parseColorShare', () => {
  it('accepts a valid state', () => {
    expect(parseColorShare(ok, 1)).toEqual(ok);
  });

  it('refuses other versions', () => {
    expect(parseColorShare(ok, 2)).toBeNull();
  });

  it('refuses bad colours, oversized palettes and out-of-range scales', () => {
    expect(
      parseColorShare({ ...ok, colors: { ...ok.colors, fg: 'nope' } }, 1),
    ).toBeNull();
    expect(
      parseColorShare({ ...ok, palette: Array(33).fill('#000') }, 1),
    ).toBeNull();
    expect(
      parseColorShare({ ...ok, scale: { hueShift: 999, chromaCurve: 0 } }, 1),
    ).toBeNull();
    expect(parseColorShare(null, 1)).toBeNull();
    expect(parseColorShare({ ...ok, palette: 'x' }, 1)).toBeNull();
  });
});
