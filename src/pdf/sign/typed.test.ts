import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import fontkit from '@pdf-lib/fontkit';
import { layoutInk } from '@/pdf/edit/text-fit';
import type { SignatureFont } from './fonts';
import { slantMatrix, typedLayout, type TypedSignature } from './typed';

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
