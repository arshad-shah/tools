import { describe, expect, it } from 'vitest';
import { contrastRatio, parseColor } from '@/shared/lib/colour';
import { apcaHint, contrastSummary, suggestFor } from './contrast-view';

describe('contrastSummary', () => {
  it('#777 on white is 4.48: large AA passes, normal AA fails', () => {
    const s = contrastSummary('#777', '#fff');
    expect(s.ratio).toBe(4.48);
    expect(s.levels.normalAA).toBe(false);
    expect(s.levels.largeAA).toBe(true);
    expect(s.levels.uiAA).toBe(true);
    expect(s.apca).toBeGreaterThan(60);
    expect(s.apca).toBeLessThan(75);
    expect(s.apcaHint).toMatch(/Content text/);
  });

  it('black on white is 21 with every level passing', () => {
    const s = contrastSummary('#000', '#fff');
    expect(s.ratio).toBe(21);
    expect(Object.values(s.levels).every(Boolean)).toBe(true);
  });

  it('composites a semi-transparent foreground over the background', () => {
    const half = contrastSummary('rgb(0 0 0 / 0.5)', '#fff').ratio;
    const opaque = contrastSummary('#000', '#fff').ratio;
    const mixed = contrastSummary('#808080', '#fff').ratio;
    expect(half).toBeLessThan(opaque);
    expect(Math.abs(half - mixed)).toBeLessThan(0.1);
  });
});

describe('suggestFor', () => {
  it('a suggestion for #999 on white at 4.5 passes', () => {
    const hex = suggestFor('#999', '#fff', 4.5, 'fg');
    expect(hex).not.toBeNull();
    expect(
      contrastRatio(parseColor(hex!), parseColor('#fff')),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it('can move the background instead', () => {
    const hex = suggestFor('#fff', '#999', 4.5, 'bg');
    expect(
      contrastRatio(parseColor('#fff'), parseColor(hex!)),
    ).toBeGreaterThanOrEqual(4.5);
  });
});

describe('apcaHint', () => {
  it('follows the bronze lookup for both polarities', () => {
    expect(apcaHint(80)).toMatch(/Body text/);
    expect(apcaHint(-50)).toMatch(/Large text/);
    expect(apcaHint(31)).toMatch(/Spot text/);
    expect(apcaHint(10)).toMatch(/Too low/);
  });
});
