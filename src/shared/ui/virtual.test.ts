import { describe, expect, it } from 'vitest';
import { cumulativeOffsets, visibleRange } from './virtual';

describe('cumulativeOffsets', () => {
  it('adds sizes and gaps', () => {
    expect(cumulativeOffsets([10, 20, 30], 5)).toEqual([0, 15, 40]);
    expect(cumulativeOffsets([], 5)).toEqual([]);
  });
});

describe('visibleRange', () => {
  // Ten items of 100px with a 10px gap: item i spans [110i, 110i + 100).
  const sizes = Array.from({ length: 10 }, () => 100);
  const offsets = cumulativeOffsets(sizes, 10);

  it.each([
    ['start', 0, 250, 0, { start: 0, end: 3 }],
    ['start with overscan', 0, 250, 2, { start: 0, end: 5 }],
    ['middle', 450, 200, 0, { start: 4, end: 6 }],
    ['middle with overscan', 450, 200, 1, { start: 3, end: 7 }],
    ['top edge inside a gap', 212, 100, 0, { start: 2, end: 3 }],
    ['end', 1000, 500, 0, { start: 9, end: 10 }],
    ['end with overscan', 1000, 500, 3, { start: 6, end: 10 }],
    ['past the end', 5000, 500, 0, { start: 10, end: 10 }],
  ])('%s', (_name, scrollTop, viewport, overscan, want) => {
    expect(visibleRange(offsets, sizes, scrollTop, viewport, overscan)).toEqual(
      want,
    );
  });

  it('is empty for no items', () => {
    expect(visibleRange([], [], 0, 500, 3)).toEqual({ start: 0, end: 0 });
  });
});
