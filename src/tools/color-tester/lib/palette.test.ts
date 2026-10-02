import { describe, expect, it } from 'vitest';
import {
  INITIAL_PALETTE,
  luminance,
  parseRgb,
  textColorFor,
  toHex,
  toRgbString,
  wcagLevel,
} from './palette';

describe('palette helpers', () => {
  it('formats hex and rgb strings', () => {
    expect(toHex(255, 105, 180)).toBe('#ff69b4');
    expect(toHex(0, 0, 0)).toBe('#000000');
    expect(toRgbString(1, 2, 3, 1)).toBe('rgb(1, 2, 3)');
    expect(toRgbString(1, 2, 3, 0.5)).toBe('rgba(1, 2, 3, 0.5)');
  });

  it('picks the text colour from luminance', () => {
    expect(luminance(255, 255, 255)).toBeCloseTo(1, 5);
    expect(textColorFor(255, 255, 255)).toBe('#000000');
    expect(textColorFor(0, 0, 0)).toBe('#ffffff');
    // By WCAG ratio, not perceived brightness: steel blue reads better
    // in black (5.1:1) than in white (4.1:1).
    expect(textColorFor(70, 130, 180)).toBe('#000000');
    expect(textColorFor(100, 100, 100)).toBe('#ffffff');
  });

  it('parses rgb() strings only', () => {
    expect(parseRgb('rgb(0, 255, 12)')).toEqual({ r: 0, g: 255, b: 12 });
    expect(parseRgb('#ffffff')).toBeNull();
  });

  it('grades WCAG contrast', () => {
    expect(wcagLevel(7)).toEqual({ label: 'AAA', colorScheme: 'success' });
    expect(wcagLevel(4.5)).toEqual({ label: 'AA', colorScheme: 'success' });
    expect(wcagLevel(3)).toEqual({ label: 'AA Large', colorScheme: 'warning' });
    expect(wcagLevel(2.99)).toEqual({ label: 'Fail', colorScheme: 'danger' });
  });

  it('starts with six consistent colours', () => {
    expect(INITIAL_PALETTE).toHaveLength(6);
    for (const c of INITIAL_PALETTE) {
      expect(c.hex).toBe(toHex(c.red, c.green, c.blue));
      expect(c.rgb).toBe(toRgbString(c.red, c.green, c.blue, c.alpha));
    }
  });
});
