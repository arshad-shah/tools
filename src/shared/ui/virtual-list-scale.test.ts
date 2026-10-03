import { describe, expect, it } from 'vitest';
import { MAX_SCROLL_HEIGHT, scrollScale } from './virtual-list-scale';

describe('scrollScale', () => {
  it('is the identity while the content fits the browser cap', () => {
    const s = scrollScale(1_000_000, 500);
    expect(s.height).toBe(1_000_000);
    expect(s.toLogical(1234)).toBe(1234);
    expect(s.toPhysical(1234)).toBe(1234);
  });

  it('maps a taller content onto the capped height, end to end', () => {
    const total = 20_000_000 * 3; // a million rows at 60 px, say
    const viewport = 600;
    const s = scrollScale(total, viewport);
    expect(s.height).toBe(MAX_SCROLL_HEIGHT);
    expect(s.toLogical(0)).toBe(0);
    // The last physical scroll position shows the last logical one.
    expect(s.toLogical(MAX_SCROLL_HEIGHT - viewport)).toBeCloseTo(
      total - viewport,
    );
    expect(s.toPhysical(total - viewport)).toBeCloseTo(
      MAX_SCROLL_HEIGHT - viewport,
    );
    expect(s.toPhysical(s.toLogical(4_321_000))).toBeCloseTo(4_321_000);
  });

  it('stays finite for a viewport at least as tall as the cap', () => {
    const s = scrollScale(MAX_SCROLL_HEIGHT * 2, MAX_SCROLL_HEIGHT);
    expect(Number.isFinite(s.toLogical(10))).toBe(true);
  });
});
