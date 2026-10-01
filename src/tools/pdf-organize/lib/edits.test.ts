import { describe, expect, it } from 'vitest';
import {
  initialTiles,
  rangeSelect,
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

describe('rangeSelect', () => {
  const tiles = [...initialTiles(5)].reverse(); // p4 p3 p2 p1 p0
  it('selects inclusively in display order, either direction', () => {
    expect([...rangeSelect(tiles, 'p3', 'p1')]).toEqual(['p3', 'p2', 'p1']);
    expect([...rangeSelect(tiles, 'p1', 'p3')]).toEqual(['p3', 'p2', 'p1']);
  });
  it('falls back to the clicked tile without a valid anchor', () => {
    expect([...rangeSelect(tiles, null, 'p2')]).toEqual(['p2']);
    expect([...rangeSelect(tiles, 'gone', 'p2')]).toEqual(['p2']);
  });
});
