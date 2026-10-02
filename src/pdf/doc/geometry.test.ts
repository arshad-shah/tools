import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { PDFPageProxy } from 'pdfjs-dist';
import {
  boxToScreen,
  pageViewport,
  screenRectToBox,
  toPage,
  toScreen,
} from './geometry';
import type { PageGeom } from './types';

const view: [number, number, number, number] = [0, 0, 612, 792];
const points: [number, number][] = [
  [0, 0],
  [612, 792],
  [100, 700],
];

// pdfjs-dist 6 does not export PageViewport: compare against a real page's
// getViewport, which is what the render worker uses.
let page: PDFPageProxy;
let destroy: () => Promise<void>;
beforeAll(async () => {
  const doc = await PDFDocument.create();
  doc.addPage([612, 792]);
  const task = getDocument({ data: await doc.save(), verbosity: 0 });
  page = await (await task.promise).getPage(1);
  destroy = () => task.destroy();
});
afterAll(() => destroy());
const pdfjsViewport = (scale: number, rotation: number) =>
  page.getViewport({ scale, rotation });

describe('pageViewport', () => {
  for (const rotation of [0, 90, 180, 270] as const) {
    it(`matches pdf.js PageViewport at rotation ${rotation}`, () => {
      const geom: PageGeom = { view, rotate: 0 };
      const ours = pageViewport(geom, rotation, 1.5);
      const theirs = pdfjsViewport(1.5, rotation);
      expect(ours.width).toBeCloseTo(theirs.width);
      expect(ours.height).toBeCloseTo(theirs.height);
      for (const [x, y] of points) {
        const [sx, sy] = toScreen(ours, x, y);
        const [ex, ey] = theirs.convertToViewportPoint(x, y);
        expect(sx).toBeCloseTo(ex);
        expect(sy).toBeCloseTo(ey);
        const [px, py] = toPage(ours, sx, sy);
        expect(px).toBeCloseTo(x);
        expect(py).toBeCloseTo(y);
      }
    });
  }

  it('adds the pending rotation to the page own rotation', () => {
    const vp = pageViewport({ view, rotate: 90 }, 90, 1);
    const theirs = pdfjsViewport(1, 180);
    expect(vp.transform).toEqual(theirs.transform.map((n: number) => n + 0));
  });

  it('a crop box sizes the viewport', () => {
    const vp = pageViewport({ view, rotate: 0 }, 0, 1, {
      x: 100,
      y: 100,
      width: 200,
      height: 300,
    });
    expect(vp.width).toBe(200);
    expect(vp.height).toBe(300);
    expect(toScreen(vp, 100, 400)).toEqual([0, 0]);
  });
});

describe('boxes', () => {
  it('maps a page box to a screen rect and back', () => {
    for (const rotation of [0, 90, 180, 270] as const) {
      const vp = pageViewport({ view, rotate: 0 }, rotation, 2);
      const box = { x: 100, y: 700, width: 50, height: 20 };
      const rect = boxToScreen(vp, box);
      expect(rect.width).toBeGreaterThan(0);
      expect(rect.height).toBeGreaterThan(0);
      const back = screenRectToBox(vp, rect);
      expect(back.x).toBeCloseTo(box.x);
      expect(back.y).toBeCloseTo(box.y);
      expect(back.width).toBeCloseTo(box.width);
      expect(back.height).toBeCloseTo(box.height);
    }
  });

  it('unrotated: top-left origin with y flipped', () => {
    const vp = pageViewport({ view, rotate: 0 }, 0, 1);
    expect(boxToScreen(vp, { x: 100, y: 700, width: 50, height: 20 })).toEqual({
      left: 100,
      top: 72,
      width: 50,
      height: 20,
    });
  });
});
