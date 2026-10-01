import { describe, expect, it } from 'vitest';
import {
  canvasPx,
  exportScale,
  MAX_CANVAS_PIXELS,
  renderScale,
} from './render-scale';

describe('renderScale', () => {
  it('scales a page to the requested width', () => {
    const s = renderScale(612, 792, 200);
    expect(Math.ceil(612 * s)).toBe(200);
    expect(Math.ceil(792 * s)).toBe(259);
  });
  it('never upscales past 4x', () => {
    expect(renderScale(100, 100, 10_000)).toBe(4);
  });
  it('caps the canvas area', () => {
    const s = renderScale(14400, 14400, 14400);
    expect(Math.ceil(14400 * s) * Math.ceil(14400 * s)).toBeLessThanOrEqual(
      MAX_CANVAS_PIXELS,
    );
    expect(Math.ceil(14400 * s)).toBeGreaterThan(4000);
  });
  it.each([0, -5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects width %s with INVALID_INPUT',
    (w) => {
      expect(() => renderScale(612, 792, w)).toThrow(
        expect.objectContaining({ code: 'INVALID_INPUT' }),
      );
    },
  );
});

describe('exportScale', () => {
  it('maps DPI to a pdf.js scale (1 = 72 DPI)', () => {
    expect(exportScale(612, 792, 150)).toEqual({
      scale: 150 / 72,
      dpi: 150,
      capped: false,
    });
  });
  it('caps large pages at the canvas area limit and reports the real DPI', () => {
    const r = exportScale(842, 1191, 300); // A3 at 300 DPI = 17.4 MP
    expect(r.capped).toBe(true);
    expect(r.dpi).toBeLessThan(300);
    expect(r.dpi).toBeGreaterThan(280);
    expect(
      Math.ceil(842 * r.scale) * Math.ceil(1191 * r.scale),
    ).toBeLessThanOrEqual(MAX_CANVAS_PIXELS);
  });
  it('caps very large pages (A0 at 300 DPI) well below the request', () => {
    const r = exportScale(2384, 3370, 300);
    expect(r.capped).toBe(true);
    expect(r.dpi).toBeLessThan(110);
    expect(
      Math.ceil(2384 * r.scale) * Math.ceil(3370 * r.scale),
    ).toBeLessThanOrEqual(MAX_CANVAS_PIXELS);
  });
  it.each([71, 301, 150.5, Number.NaN])('rejects %s DPI', (dpi) => {
    expect(() => exportScale(612, 792, dpi)).toThrow(
      'Resolution must be a whole number from 72 to 300 DPI',
    );
  });
});

describe('canvasPx', () => {
  it('does not round float noise up to an extra pixel', () => {
    expect(792 * (150 / 72)).toBeGreaterThan(1650); // 1650.0000000000002
    expect(canvasPx(792 * (150 / 72))).toBe(1650);
  });
  it('still rounds real fractions up', () => {
    expect(canvasPx(100.2)).toBe(101);
    expect(canvasPx(0.5)).toBe(1);
  });
});
