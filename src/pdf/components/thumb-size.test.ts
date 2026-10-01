import { describe, expect, it } from 'vitest';
import { thumbBoxSize } from './thumb-size';

const portrait = { width: 600, height: 800 };
const landscape = { width: 800, height: 600 };

describe('thumbBoxSize', () => {
  it('fills the width when upright', () => {
    expect(thumbBoxSize(portrait, 120, 0)).toEqual({
      outerHeight: 160,
      innerWidth: 120,
    });
    expect(thumbBoxSize(portrait, 120, 180).innerWidth).toBe(120);
  });
  it('shrinks a quarter-turned portrait page so its height fits the width', () => {
    for (const r of [90, 270] as const) {
      const { innerWidth, outerHeight } = thumbBoxSize(portrait, 120, r);
      expect(innerWidth).toBe(90);
      // visual width after rotation = inner height
      expect(innerWidth * (800 / 600)).toBeCloseTo(120);
      expect(innerWidth).toBeLessThanOrEqual(outerHeight);
    }
  });
  it('keeps a quarter-turned landscape page at full width (it fits the box)', () => {
    const { innerWidth, outerHeight } = thumbBoxSize(landscape, 120, 90);
    expect(innerWidth).toBe(120);
    expect(outerHeight).toBe(160);
  });
});
