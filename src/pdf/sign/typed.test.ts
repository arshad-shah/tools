import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import fontkit from '@pdf-lib/fontkit';
import { layoutInk } from '@/pdf/edit/text-fit';
import type { SignatureFont } from './fonts';
import {
  slantMatrix,
  typedLayout,
  typedVector,
  type TypedSignature,
} from './typed';

let font: SignatureFont;
beforeAll(() => {
  font = fontkit.create(
    readFileSync(
      'node_modules/@fontsource/great-vibes/files/great-vibes-latin-400-normal.woff',
    ),
  ) as unknown as SignatureFont;
});

const sig = (patch: Partial<TypedSignature> = {}): TypedSignature => ({
  text: 'Ada Lovelace',
  fontId: 'great-vibes',
  color: '#111827',
  slant: 0,
  size: 'fit',
  ...patch,
});
const BOX = { x: 100, y: 200, width: 220, height: 60 };
const tan = (deg: number) => Math.tan((deg * Math.PI) / 180);

/** Page-space corners of the inked area after the slant about the baseline. */
function slantedInk(s: TypedSignature, l: ReturnType<typeof typedLayout>) {
  const { ink } = layoutInk(font, s.text);
  const t = tan(s.slant);
  const pts = [
    [ink.minX, ink.minY],
    [ink.maxX, ink.minY],
    [ink.minX, ink.maxY],
    [ink.maxX, ink.maxY],
  ].map(([x, y]) => [l.x + (x + t * y) * l.size, l.baseline + y * l.size]);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

describe('slantMatrix', () => {
  it('is the identity without slant', () => {
    expect(slantMatrix(0)).toEqual([1, 0, 0, 1, 0, 0]);
  });

  it('shears x by tan of the angle', () => {
    expect(slantMatrix(20)[2]).toBeCloseTo(tan(20), 12);
    expect(slantMatrix(-10)[2]).toBeCloseTo(-tan(10), 12);
  });
});

describe('typedLayout', () => {
  for (const slant of [-20, 0, 12, 20])
    it(`keeps the ink inside the box at a slant of ${slant} degrees`, () => {
      const s = sig({ slant });
      const l = typedLayout(font, s, BOX);
      const ink = slantedInk(s, l);
      expect(ink.minX).toBeGreaterThanOrEqual(BOX.x - 1e-6);
      expect(ink.maxX).toBeLessThanOrEqual(BOX.x + BOX.width + 1e-6);
      expect(ink.minY).toBeGreaterThanOrEqual(BOX.y - 1e-6);
      expect(ink.maxY).toBeLessThanOrEqual(BOX.y + BOX.height + 1e-6);
      expect(l.width).toBeCloseTo(ink.maxX - ink.minX, 6);
    });

  it('slant widens the ink, so a fitted size gets smaller', () => {
    const upright = typedLayout(font, sig(), BOX);
    const slanted = typedLayout(font, sig({ slant: 20 }), BOX);
    expect(slanted.size).toBeLessThan(upright.size);
  });

  it('a fixed size is kept when it fits, and capped when it does not', () => {
    expect(typedLayout(font, sig({ size: 10 }), BOX).size).toBe(10);
    const fit = typedLayout(font, sig(), BOX).size;
    expect(typedLayout(font, sig({ size: 500 }), BOX).size).toBeCloseTo(fit);
  });

  it('centres a fixed-size signature in the box', () => {
    const s = sig({ size: 10 });
    const ink = slantedInk(s, typedLayout(font, s, BOX));
    expect((ink.minX + ink.maxX) / 2).toBeCloseTo(BOX.x + BOX.width / 2, 6);
    expect((ink.minY + ink.maxY) / 2).toBeCloseTo(BOX.y + BOX.height / 2, 6);
  });
});

describe('typedVector', () => {
  // Two 1-em squares side by side: the ink is 2 em wide, 1 em tall.
  const square = {
    advanceWidth: 1000,
    bbox: { minX: 0, minY: 0, maxX: 1000, maxY: 1000 },
    path: { toSVG: () => 'M0 0L1000 0L1000 1000L0 1000Z' },
  };
  const font = {
    unitsPerEm: 1000,
    layout: () => ({ glyphs: [square, square] }),
  } as unknown as SignatureFont;

  it('is the glyph outlines, y down, cropped to the ink', () => {
    expect(typedVector(font, 'ab', 0)).toEqual({
      d: 'M0 100L100 100L100 0L0 0ZM100 100L200 100L200 0L100 0Z',
      width: 200,
      height: 100,
    });
  });

  it('leans right by the slant, sheared about the baseline', () => {
    const v = typedVector(font, 'ab', 45);
    expect(v.width).toBeCloseTo(300);
    expect(v.height).toBe(100);
    // The first square's top-left corner moves right by its height.
    expect(v.d.startsWith('M0 100L100 100L200 0L100 0Z')).toBe(true);
  });
});
