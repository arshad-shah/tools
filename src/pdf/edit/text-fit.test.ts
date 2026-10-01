import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import fontkit from '@pdf-lib/fontkit';
import { describe, expect, it } from 'vitest';
import { fitInk, layoutInk } from './text-fit';

const font = fontkit.create(
  new Uint8Array(
    readFileSync(
      createRequire(import.meta.url).resolve(
        '@fontsource/great-vibes/files/great-vibes-latin-400-normal.woff',
      ),
    ),
  ),
);

describe('layoutInk', () => {
  it('measures the inked area, flourishes included, in em units', () => {
    const { ink, glyphs, unitsPerEm } = layoutInk(font, 'Ada');
    expect(unitsPerEm).toBe(1000);
    expect(glyphs).toHaveLength(3);
    expect(glyphs[0].x).toBe(0);
    expect(glyphs[1].x).toBeGreaterThan(0);
    // Ink reaches well beyond the advance-width box of a plain line.
    expect(ink.maxY - ink.minY).toBeGreaterThan(0.5);
    expect(ink.maxX).toBeGreaterThan(ink.minX);
  });
  it('ignores empty glyphs such as spaces', () => {
    const a = layoutInk(font, 'A');
    const b = layoutInk(font, 'A ');
    expect(b.ink).toEqual(a.ink);
  });
});

describe('fitInk', () => {
  it('scales the ink to the box and centres it', () => {
    // 2 em wide, 1 em tall, starting 0.5 em left of the origin and 0.25 em below the baseline.
    const ink = { minX: -0.5, maxX: 1.5, minY: -0.25, maxY: 0.75 };
    expect(fitInk({ width: 100, height: 100 }, ink)).toEqual({
      size: 50,
      x: 25,
      y: 37.5,
    });
    expect(fitInk({ width: 400, height: 100 }, ink)).toEqual({
      size: 100,
      x: 150,
      y: 25,
    });
  });
  it('rejects text with no ink', () => {
    expect(() =>
      fitInk({ width: 10, height: 10 }, { minX: 0, maxX: 0, minY: 0, maxY: 0 }),
    ).toThrow('has nothing to draw');
  });
});
