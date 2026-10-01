import { describe, expect, it } from 'vitest';
import { planSplit, selectionLabel } from './plan';

const base = {
  pageCount: 5,
  rangeText: '',
  everyN: 2,
  selected: [] as number[],
};

describe('planSplit', () => {
  it('ranges mode parses the text', () => {
    expect(planSplit('ranges', { ...base, rangeText: '1-2, 5' })).toEqual([
      { start: 0, end: 1 },
      { start: 4, end: 4 },
    ]);
  });
  it('every-n chunks', () => {
    expect(planSplit('every-n', base)).toEqual([
      { start: 0, end: 1 },
      { start: 2, end: 3 },
      { start: 4, end: 4 },
    ]);
  });
  it('individual makes one range per page', () => {
    expect(planSplit('individual', base)).toHaveLength(5);
  });
  it('selection merges selected pages into contiguous runs, ascending', () => {
    expect(planSplit('selection', { ...base, selected: [4, 0, 1] })).toEqual([
      { start: 0, end: 1 },
      { start: 4, end: 4 },
    ]);
  });
  it('selection with nothing selected is an input error', () => {
    expect(() => planSplit('selection', base)).toThrow(
      expect.objectContaining({
        code: 'INVALID_INPUT',
        message: 'Select at least one page',
      }),
    );
  });
});

describe('selectionLabel', () => {
  it('one run', () => {
    expect(selectionLabel([{ start: 0, end: 2 }])).toBe('1-3');
  });
  it('three runs stay explicit', () => {
    expect(
      selectionLabel([
        { start: 0, end: 2 },
        { start: 4, end: 4 },
        { start: 7, end: 8 },
      ]),
    ).toBe('1-3_5_8-9');
  });
  it('many runs collapse to a count', () => {
    const ranges = Array.from({ length: 150 }, (_, i) => ({
      start: i * 2,
      end: i * 2,
    }));
    expect(selectionLabel(ranges)).toBe('150-selected');
  });
});
