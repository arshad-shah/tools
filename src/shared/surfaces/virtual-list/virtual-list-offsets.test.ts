import { describe, expect, it } from 'vitest';
import {
  createSizeModel,
  scrollTopForIndex,
  visibleRange,
  withOverscan,
} from './virtual-list-offsets';

describe('createSizeModel', () => {
  it('fixed size answers offsets arithmetically for a million rows', () => {
    const m = createSizeModel(1_000_000, 20);
    expect(m.total()).toBe(20_000_000);
    expect(m.offsetOf(0)).toBe(0);
    expect(m.offsetOf(999_999)).toBe(19_999_980);
    expect(m.sizeOf(10)).toBe(20);
    expect(m.indexAt(0)).toBe(0);
    expect(m.indexAt(39.9)).toBe(1);
    expect(m.indexAt(-5)).toBe(0);
    expect(m.indexAt(1e12)).toBe(999_999);
  });

  it('per-index estimates build prefix sums and binary search', () => {
    const m = createSizeModel(5, (i) => (i + 1) * 10);
    // sizes 10 20 30 40 50, offsets 0 10 30 60 100
    expect(m.total()).toBe(150);
    expect(m.offsetOf(3)).toBe(60);
    expect(m.indexAt(29)).toBe(1);
    expect(m.indexAt(30)).toBe(2);
    expect(m.indexAt(149)).toBe(4);
  });

  it('setSize returns the delta and shifts later offsets', () => {
    const m = createSizeModel(4, 20);
    expect(m.setSize(1, 20)).toBe(0);
    expect(m.setSize(1, 50)).toBe(30);
    expect(m.total()).toBe(110);
    expect(m.offsetOf(2)).toBe(70);
    expect(m.sizeOf(1)).toBe(50);
    expect(m.indexAt(69)).toBe(1);
    expect(m.setSize(0, 10)).toBe(-10);
    expect(m.offsetOf(3)).toBe(80);
  });

  it('handles an empty list', () => {
    const m = createSizeModel(0, 20);
    expect(m.total()).toBe(0);
    expect(visibleRange(m, 0, 200)).toEqual({ start: 0, end: 0 });
  });
});

describe('ranges and alignment', () => {
  const m = createSizeModel(100_000, 20);

  it('visibleRange covers the viewport, end exclusive', () => {
    expect(visibleRange(m, 0, 200)).toEqual({ start: 0, end: 10 });
    expect(visibleRange(m, 10, 200)).toEqual({ start: 0, end: 11 });
    expect(visibleRange(m, 0, 0)).toEqual({ start: 0, end: 1 });
  });

  it('withOverscan clamps to the list', () => {
    expect(withOverscan({ start: 0, end: 10 }, 6, 100_000)).toEqual({
      start: 0,
      end: 16,
    });
    expect(withOverscan({ start: 99_995, end: 100_000 }, 6, 100_000)).toEqual({
      start: 99_989,
      end: 100_000,
    });
  });

  it('scrollTopForIndex aligns start, center and auto', () => {
    expect(scrollTopForIndex(m, 5000, 'start', 0, 200)).toBe(100_000);
    expect(scrollTopForIndex(m, 5000, 'center', 0, 200)).toBe(
      5000 * 20 - 100 + 10,
    );
    // auto: already visible keeps the position
    expect(scrollTopForIndex(m, 3, 'auto', 0, 200)).toBe(0);
    // below: bottom edge aligned
    expect(scrollTopForIndex(m, 20, 'auto', 0, 200)).toBe(220);
    // above: top edge aligned
    expect(scrollTopForIndex(m, 2, 'auto', 400, 200)).toBe(40);
    // clamped to the scrollable range
    expect(scrollTopForIndex(m, 0, 'center', 0, 200)).toBe(0);
    expect(scrollTopForIndex(m, 99_999, 'start', 0, 200)).toBe(
      100_000 * 20 - 200,
    );
  });
});
