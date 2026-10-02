import { describe, expect, it } from 'vitest';
import {
  imageCoverage,
  otsuThreshold,
  rulingSegments,
  segmentsToPage,
  toGray,
  type GrayImage,
  type ImageOpsTable,
} from './raster';

const DPI = 150;

/** White image of `w` x `h` px. */
function blank(width: number, height: number): GrayImage {
  return { width, height, data: new Uint8Array(width * height).fill(250) };
}
function hrule(img: GrayImage, y: number, x1: number, x2: number, t = 2) {
  for (let r = y; r < y + t; r++)
    for (let x = x1; x <= x2; x++) img.data[r * img.width + x] = 20;
}
function vrule(img: GrayImage, x: number, y1: number, y2: number, t = 2) {
  for (let y = y1; y <= y2; y++)
    for (let c = x; c < x + t; c++) img.data[y * img.width + c] = 20;
}

/** A 3x2 grid (3 rows of cells, 2 columns): 4 horizontals, 3 verticals. */
function grid(): GrayImage {
  const img = blank(600, 500);
  for (const y of [50, 150, 250, 350]) hrule(img, y, 100, 501);
  for (const x of [100, 300, 500]) vrule(img, x, 50, 351);
  return img;
}

const horizontal = (s: { y1: number; y2: number }) => s.y1 === s.y2;

describe('otsuThreshold', () => {
  it('separates dark rules from light paper', () => {
    const t = otsuThreshold(grid().data);
    expect(t).toBeGreaterThanOrEqual(20);
    expect(t).toBeLessThan(250);
  });

  it('handles a uniform image', () => {
    expect(() => otsuThreshold(new Uint8Array(100).fill(255))).not.toThrow();
  });
});

describe('rulingSegments', () => {
  it('finds the 4 horizontal and 3 vertical rules of a 3x2 grid', () => {
    const segs = rulingSegments(grid(), DPI);
    const h = segs.filter(horizontal).sort((a, b) => a.y1 - b.y1);
    const v = segs.filter((s) => !horizontal(s)).sort((a, b) => a.x1 - b.x1);
    expect(h).toHaveLength(4);
    expect(v).toHaveLength(3);
    // 2px rules at rows y, y+1: centre line at y + 1 (pixel edges), +-1px.
    [50, 150, 250, 350].forEach((y, i) => {
      expect(Math.abs(h[i].y1 - (y + 1))).toBeLessThanOrEqual(1);
      expect(Math.abs(h[i].x1 - 100)).toBeLessThanOrEqual(1);
      expect(Math.abs(h[i].x2 - 502)).toBeLessThanOrEqual(1);
    });
    [100, 300, 500].forEach((x, i) => {
      expect(Math.abs(v[i].x1 - (x + 1))).toBeLessThanOrEqual(1);
      expect(Math.abs(v[i].y1 - 50)).toBeLessThanOrEqual(1);
      expect(Math.abs(v[i].y2 - 352)).toBeLessThanOrEqual(1);
    });
  });

  it('ignores speckle noise', () => {
    const img = blank(600, 500);
    let seed = 7;
    const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;
    for (let i = 0; i < img.data.length; i++) if (rnd() < 0.02) img.data[i] = 0;
    expect(rulingSegments(img, DPI)).toEqual([]);
  });

  it('closes small gaps in a broken rule', () => {
    const img = blank(400, 100);
    hrule(img, 40, 20, 120);
    hrule(img, 40, 123, 300); // 2px gap
    const segs = rulingSegments(img, DPI);
    expect(segs).toHaveLength(1);
    expect(segs[0].x2 - segs[0].x1).toBeGreaterThan(270);
  });

  it('drops runs shorter than 36pt and thick dark blocks', () => {
    const img = blank(400, 200);
    hrule(img, 20, 10, 10 + Math.floor((36 * DPI) / 72) - 5); // just short
    hrule(img, 80, 10, 300, 20); // a filled bar, not a rule
    expect(rulingSegments(img, DPI)).toEqual([]);
  });

  it('does not take a line of text for a rule', () => {
    const img = blank(400, 60);
    // Letter stems 2px wide every 5px: closed into a run, but half empty.
    for (let x = 10; x < 300; x += 5) vrule(img, x, 20, 40);
    for (let x = 10; x < 300; x += 5) hrule(img, 30, x, x + 1, 1);
    expect(rulingSegments(img, DPI)).toEqual([]);
  });
});

describe('toGray', () => {
  it('averages RGBA to luma', () => {
    const g = toGray(new Uint8Array([255, 255, 255, 255, 0, 0, 0, 255]), 2, 1);
    expect(Array.from(g.data)).toEqual([255, 0]);
  });
});

describe('segmentsToPage', () => {
  it('maps image pixels to page points through the render viewport', () => {
    const geom = {
      view: [0, 0, 612, 792] as [number, number, number, number],
      rotate: 0 as const,
    };
    const [s] = segmentsToPage([{ x1: 0, y1: 0, x2: 150, y2: 0 }], geom, DPI);
    expect(s.x1).toBeCloseTo(0);
    expect(s.y1).toBeCloseTo(792);
    expect(s.x2).toBeCloseTo(72);
    expect(s.y2).toBeCloseTo(792);
  });

  it('honours the page rotation', () => {
    const geom = {
      view: [0, 0, 612, 792] as [number, number, number, number],
      rotate: 90 as const,
    };
    const [s] = segmentsToPage([{ x1: 0, y1: 0, x2: 0, y2: 150 }], geom, DPI);
    // Rotated 90: viewport top-left is page origin, viewport y runs along page x.
    expect(s.x1).toBeCloseTo(0);
    expect(s.y1).toBeCloseTo(0);
    expect(s.x2).toBeCloseTo(72);
    expect(s.y2).toBeCloseTo(0);
  });
});

describe('imageCoverage', () => {
  const OPS: ImageOpsTable = {
    save: 1,
    restore: 2,
    transform: 3,
    paintFormXObjectBegin: 4,
    paintFormXObjectEnd: 5,
    paintImageXObject: 6,
    paintInlineImageXObject: 7,
    paintImageXObjectRepeat: 8,
  };
  const view: [number, number, number, number] = [0, 0, 612, 792];

  it('is the largest image area over the page area', () => {
    const list = {
      fnArray: [1, 3, 6, 2, 1, 3, 7, 2],
      argsArray: [
        [],
        [612, 0, 0, 792, 0, 0],
        ['img1', 10, 10],
        [],
        [],
        [100, 0, 0, 100, 0, 0],
        [{}],
        [],
      ],
    };
    expect(imageCoverage(list, OPS, view)).toBeCloseTo(1);
  });

  it('is 0 without images and small for a logo', () => {
    expect(imageCoverage({ fnArray: [], argsArray: [] }, OPS, view)).toBe(0);
    const logo = {
      fnArray: [1, 3, 6, 2],
      argsArray: [[], [100, 0, 0, 50, 20, 700], ['img', 1, 1], []],
    };
    expect(imageCoverage(logo, OPS, view)).toBeLessThan(0.05);
  });
});
