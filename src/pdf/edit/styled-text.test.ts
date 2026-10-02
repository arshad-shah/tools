import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { textPositions } from '../../../test/fixtures/builders';
import { drawStyledText } from './draw-styled-text';
import { FontCache } from './font-cache';
import { layoutStyled } from './styled-layout';

const mono = (_ch: string, size: number) => 0.5 * size;
const heights = (size: number) => ({
  ascent: 0.7 * size,
  descent: -0.2 * size,
});

describe('layoutStyled', () => {
  it('centres one character in each comb cell and drops the overflow', () => {
    const l = layoutStyled(
      mono,
      heights,
      '1234567890',
      { width: 160, height: 20 },
      {
        size: 10,
        comb: 8,
      },
    );
    expect(l.x).toEqual([0, 1, 2, 3, 4, 5, 6, 7].map((i) => 20 * i + 7.5));
    expect(l.truncated).toBe(true);
  });
  it('adds letter spacing after each character, shrinking to fit', () => {
    const l = layoutStyled(
      mono,
      heights,
      'ABC',
      { width: 100, height: 20 },
      {
        size: 10,
        spacing: 4,
      },
    );
    expect(l.x).toEqual([0, 9, 18]);
    const tight = layoutStyled(
      mono,
      heights,
      'ABCDEFGH',
      { width: 30, height: 20 },
      {
        size: 10,
      },
    );
    expect(tight.size).toBeLessThan(10);
    expect(tight.size).toBeGreaterThanOrEqual(6);
  });
});

async function draw(text: string, style: Parameters<typeof drawStyledText>[4]) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  await drawStyledText(
    { doc, fonts: new FontCache(doc, async () => new Uint8Array()) },
    page,
    text,
    { x: 100, y: 600, width: 160, height: 20 },
    style,
  );
  return doc.save();
}

describe('drawStyledText', () => {
  it('writes comb text one character per evenly spaced cell', async () => {
    const bytes = await draw('12345678', {
      font: { standard: 'Helvetica' },
      size: 11,
      color: '#000000',
      comb: 8,
    });
    const xs = (await textPositions(bytes, 0))
      .flatMap((t) => (t.str.length === 1 ? [t.x] : []))
      .sort((a, b) => a - b);
    expect(xs).toHaveLength(8);
    const gaps = xs.slice(1).map((x, i) => x - xs[i]);
    for (const g of gaps) expect(g).toBeCloseTo(20, 1);
  });

  it('sets the character spacing operator for letter spacing', async () => {
    const bytes = await draw('ABC', {
      font: { standard: 'Helvetica' },
      size: 11,
      color: '#112233',
      spacing: 3,
    });
    const task = getDocument({ data: bytes.slice(), verbosity: 0 });
    try {
      const ops = await (
        await (await task.promise).getPage(1)
      ).getOperatorList();
      const i = ops.fnArray.indexOf(OPS.setCharSpacing);
      expect(i).toBeGreaterThanOrEqual(0);
      expect(ops.argsArray[i]).toEqual([3]);
    } finally {
      await task.destroy();
    }
  });
});
