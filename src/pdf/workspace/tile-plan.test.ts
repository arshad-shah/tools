import { describe, expect, it } from 'vitest';
import { displayToFull, planTiles, TILE_PX } from './tile-plan';

const crop = { left: 0, top: 0, width: 100, height: 200 };

describe('displayToFull', () => {
  it('is the identity without rotation, offset by the crop', () => {
    expect(
      displayToFull(
        { left: 10, top: 20, width: 5, height: 6 },
        { ...crop, left: 7, top: 3 },
        0,
      ),
    ).toEqual({ left: 17, top: 23, width: 5, height: 6 });
  });

  it('turns rects back for each quarter turn', () => {
    const r = { left: 0, top: 0, width: 10, height: 20 };
    // Displayed top-left of a clockwise turn is the original bottom-left.
    expect(displayToFull(r, crop, 90)).toEqual({
      left: 0,
      top: 190,
      width: 20,
      height: 10,
    });
    expect(displayToFull(r, crop, 180)).toEqual({
      left: 90,
      top: 180,
      width: 10,
      height: 20,
    });
    expect(displayToFull(r, crop, 270)).toEqual({
      left: 80,
      top: 0,
      width: 20,
      height: 10,
    });
  });
});

describe('planTiles', () => {
  it('covers only the visible area plus a margin', () => {
    const step = TILE_PX / 2; // dpr 2: 256 CSS px tiles
    const tiles = planTiles({
      shown: { width: 2448, height: 3168 },
      crop: { left: 0, top: 0, width: 2448, height: 3168 },
      rotate: 0,
      visible: { left: 0, top: 1000, width: 800, height: 600 },
      dpr: 2,
      margin: 0,
    });
    const rows = new Set(tiles.map((t) => t.shown.top));
    const cols = new Set(tiles.map((t) => t.shown.left));
    expect([...cols]).toEqual([0, step, 2 * step, 3 * step]);
    expect(Math.min(...rows)).toBe(3 * step);
    expect(Math.max(...rows)).toBe(6 * step);
    expect(tiles[0].source).toEqual({
      x: 0,
      y: 3 * TILE_PX,
      width: TILE_PX,
      height: TILE_PX,
    });
  });

  it('clips edge tiles to the page', () => {
    const tiles = planTiles({
      shown: { width: 300, height: 300 },
      crop: { left: 0, top: 0, width: 300, height: 300 },
      rotate: 0,
      visible: { left: 0, top: 0, width: 300, height: 300 },
      dpr: 1,
    });
    expect(tiles).toHaveLength(1);
    expect(tiles[0].shown).toEqual({
      left: 0,
      top: 0,
      width: 300,
      height: 300,
    });
  });
});
