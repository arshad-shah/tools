import { describe, expect, it } from 'vitest';
import {
  initialTiles,
  isPristine,
  removeTiles,
  rotateTiles,
  tilesToEdits,
} from './edits';

describe('organize edits', () => {
  it('starts with one unrotated tile per page', () => {
    expect(initialTiles(2)).toEqual([
      { key: 'p0', pageIndex: 0, rotation: 0 },
      { key: 'p1', pageIndex: 1, rotation: 0 },
    ]);
  });
  it('rotates selected tiles and wraps around', () => {
    const t = rotateTiles(initialTiles(2), new Set(['p0']), -90);
    expect(t.map((x) => x.rotation)).toEqual([270, 0]);
    expect(rotateTiles(t, new Set(['p0']), 90)[0].rotation).toBe(0);
  });
  it('removes tiles and converts to page edits in display order', () => {
    const reordered = [...initialTiles(3)].reverse();
    const kept = removeTiles(
      rotateTiles(reordered, new Set(['p0']), 90),
      new Set(['p1']),
    );
    expect(tilesToEdits(kept)).toEqual([
      { source: 2, rotate: 0 },
      { source: 0, rotate: 90 },
    ]);
  });
});

describe('isPristine', () => {
  it('is true only for the untouched document', () => {
    expect(isPristine(initialTiles(3), 3)).toBe(true);
    expect(isPristine(initialTiles(3).reverse(), 3)).toBe(false);
    expect(
      isPristine(rotateTiles(initialTiles(3), new Set(['p1']), 90), 3),
    ).toBe(false);
    expect(isPristine(removeTiles(initialTiles(3), new Set(['p2'])), 3)).toBe(
      false,
    );
    expect(isPristine([], 0)).toBe(true);
  });
});
