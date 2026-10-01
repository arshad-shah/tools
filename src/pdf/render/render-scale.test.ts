import { describe, expect, it } from 'vitest';
import { MAX_CANVAS_PIXELS, renderScale } from './render-scale';

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
