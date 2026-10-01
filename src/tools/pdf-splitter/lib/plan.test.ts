import { describe, expect, it } from 'vitest';
import { planSplit } from './plan';

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
