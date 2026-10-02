import { describe, expect, it } from 'vitest';
import { spaceColLabels } from './heatmap';

const measure = (t: string) => t.length * 7;
const x = (at: number) => at * 10;

describe('spaceColLabels', () => {
  it('keeps labels that fit', () => {
    const labels = [
      { at: 0, label: 'Jan' },
      { at: 5, label: 'Feb' },
    ];
    expect(spaceColLabels(labels, x, measure)).toEqual(labels);
  });

  it('drops a partial first month that would overlap the next label', () => {
    // A range starting on the 30th: Jan at column 0, Feb at column 1.
    expect(
      spaceColLabels(
        [
          { at: 0, label: 'Jan' },
          { at: 1, label: 'Feb' },
          { at: 5, label: 'Mar' },
        ],
        x,
        measure,
      ),
    ).toEqual([
      { at: 1, label: 'Feb' },
      { at: 5, label: 'Mar' },
    ]);
  });

  it('skips a later label that would collide with the one before', () => {
    expect(
      spaceColLabels(
        [
          { at: 0, label: 'Jan' },
          { at: 4, label: 'Feb' },
          { at: 5, label: 'Mar' },
        ],
        x,
        measure,
      ).map((l) => l.label),
    ).toEqual(['Jan', 'Feb']);
  });
});
