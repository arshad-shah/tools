import { describe, expect, it } from 'vitest';
import { mapBox, type OverlayTransform } from './overlay-geometry';
import {
  boxesIntersect,
  moveByPointer,
  resizeByHandle,
  resizeRotated,
} from './selection-math';

const PDF: OverlayTransform = { a: 1, b: 0, c: 0, d: -1, e: 0, f: 792 };
/** Zoom 2 on a page turned 90 degrees clockwise. */
const TURNED: OverlayTransform = { a: 0, b: 2, c: 2, d: 0, e: 0, f: 0 };
const BOX = { x: 100, y: 700, width: 50, height: 20 };

const close = (a: object, b: object) => {
  for (const [k, v] of Object.entries(b))
    expect((a as Record<string, number>)[k]).toBeCloseTo(v, 6);
};

describe('selection math', () => {
  it('moves by screen travel at any zoom and page rotation', () => {
    close(moveByPointer(PDF, BOX, 10, -5), { x: 110, y: 705 });
    // Right on screen is up the page on a page turned 90 at zoom 2.
    const moved = moveByPointer(TURNED, BOX, 20, 0);
    close(moved, { x: 100, y: 710, width: 50, height: 20 });
  });

  it('resizeRotated with no rotation matches resizeByHandle', () => {
    close(
      resizeRotated(PDF, BOX, 'se', 10, 10, false, 0),
      resizeByHandle(PDF, BOX, 'se', 10, 10, false),
    );
  });

  it('resizeRotated keeps the opposite corner fixed on screen', () => {
    const rot = 90;
    const next = resizeRotated(PDF, BOX, 'se', 0, 20, false, rot);
    // Rotated 90 clockwise, the "se" handle's local +x points down on screen.
    expect(next.width).toBeCloseTo(70, 6);
    expect(next.height).toBeCloseTo(20, 6);
    // The nw corner (local) stays where it was on screen.
    const corner = (b: typeof BOX) => {
      const r = mapBox(PDF, b);
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      // local nw relative to the centre, rotated 90 clockwise
      const lx = -r.width / 2;
      const ly = -r.height / 2;
      return [cx - ly, cy + lx];
    };
    const [x0, y0] = corner(BOX);
    const [x1, y1] = corner(next);
    expect(x1).toBeCloseTo(x0, 6);
    expect(y1).toBeCloseTo(y0, 6);
  });

  it('boxesIntersect tests screen rectangles', () => {
    const a = { left: 0, top: 0, width: 10, height: 10 };
    expect(boxesIntersect(a, { left: 5, top: 5, width: 10, height: 10 })).toBe(
      true,
    );
    expect(boxesIntersect(a, { left: 11, top: 0, width: 10, height: 10 })).toBe(
      false,
    );
  });
});
