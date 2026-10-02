import { describe, expect, it } from 'vitest';
import { pageViewport, toScreen } from '@/pdf/doc/geometry';
import type { PageGeom } from '@/pdf/doc/types';
import { selectionQuads } from './selection-quads';

const geom: PageGeom = { view: [0, 0, 612, 792], rotate: 0 };
const rect = (left: number, top: number, width: number, height: number) =>
  ({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
  }) as DOMRect;
const page = rect(100, 50, 612, 792);

describe('selectionQuads', () => {
  it('merges rects on one line into one quad', () => {
    const vp = pageViewport(geom, 0, 1);
    const quads = selectionQuads(
      [rect(172, 146, 40, 20), rect(214, 146, 30, 20)],
      page,
      vp,
    );
    expect(quads).toEqual([[72, 696, 144, 696, 72, 676, 144, 676]]);
  });

  it('two lines give two quads', () => {
    const vp = pageViewport(geom, 0, 2);
    const quads = selectionQuads(
      [rect(244, 342, 80, 40), rect(244, 392, 60, 40)],
      page,
      vp,
    );
    expect(quads).toHaveLength(2);
    expect(quads[0][1]).toBeGreaterThan(quads[1][1]);
  });

  it('rects far apart on a line stay separate; empty rects are dropped', () => {
    const vp = pageViewport(geom, 0, 1);
    expect(
      selectionQuads(
        [rect(172, 146, 40, 20), rect(300, 146, 30, 20), rect(400, 146, 0, 20)],
        page,
        vp,
      ),
    ).toHaveLength(2);
  });

  it('maps a rotated page back to page space', () => {
    const vp = pageViewport(geom, 90, 1.5);
    // A word in page space, shown on screen through the rotated viewport.
    const word = { x: 72, y: 676, width: 100, height: 20 };
    const a = toScreen(vp, word.x, word.y);
    const b = toScreen(vp, word.x + word.width, word.y + word.height);
    const screen = rect(
      page.left + Math.min(a[0], b[0]),
      page.top + Math.min(a[1], b[1]),
      Math.abs(b[0] - a[0]),
      Math.abs(b[1] - a[1]),
    );
    const [q] = selectionQuads([screen], page, vp);
    const round = (v: number[]) => v.map((n) => Math.round(n * 1000) / 1000);
    expect(round(q)).toEqual([72, 696, 172, 696, 72, 676, 172, 676]);
  });

  it('merges a rotated line split into two rects', () => {
    const vp = pageViewport(geom, 90, 1);
    const [x1, y1] = toScreen(vp, 72, 696);
    const [x2, y2] = toScreen(vp, 122, 676);
    const [x3, y3] = toScreen(vp, 124, 696);
    const [x4, y4] = toScreen(vp, 172, 676);
    const r = (ax: number, ay: number, bx: number, by: number) =>
      rect(
        page.left + Math.min(ax, bx),
        page.top + Math.min(ay, by),
        Math.abs(bx - ax),
        Math.abs(by - ay),
      );
    expect(
      selectionQuads([r(x1, y1, x2, y2), r(x3, y3, x4, y4)], page, vp),
    ).toHaveLength(1);
  });
});
