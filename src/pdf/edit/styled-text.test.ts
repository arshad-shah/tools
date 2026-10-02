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

describe('layoutStyled separators and wrapped lines', () => {
  it('drops date separators when a comb has no cells for them', () => {
    const l = layoutStyled(
      mono,
      heights,
      '01/02/2025',
      { width: 160, height: 20 },
      { size: 10, comb: 8 },
    );
    expect(l.chars.join('')).toBe('01022025');
    expect(l.truncated).toBe(false);
    const ten = layoutStyled(
      mono,
      heights,
      '01/02/2025',
      { width: 200, height: 20 },
      { size: 10, comb: 10 },
    );
    expect(ten.chars.join('')).toBe('01/02/2025');
  });

  it('wraps letter-spaced text over lines from the top', () => {
    const l = layoutStyled(
      mono,
      heights,
      'AAAA BBBB CCCC',
      { width: 40, height: 60 },
      { size: 10, spacing: 2, multiline: true },
    );
    expect(l.lines.map((x) => x.chars.join(''))).toEqual([
      'AAAA',
      'BBBB',
      'CCCC',
    ]);
    // 5pt glyphs plus 2pt after each.
    expect(l.lines[1].x).toEqual([0, 7, 14, 21]);
    const step = l.lines[0].baseline - l.lines[1].baseline;
    expect(step).toBeCloseTo(12);
    expect(l.lines[0].baseline).toBeLessThan(60);
  });

  it('fills comb rows cell by cell on wrapped lines', () => {
    const l = layoutStyled(
      mono,
      heights,
      'ABCDEFGHIJ',
      { width: 80, height: 40 },
      { size: 10, comb: 4, multiline: true },
    );
    expect(l.lines.map((x) => x.chars.join(''))).toEqual([
      'ABCD',
      'EFGH',
      'IJ',
    ]);
    expect(l.lines[2].x[1] - l.lines[2].x[0]).toBeCloseTo(20);
    expect(l.truncated).toBe(false);
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
  it('draws wrapped letter-spaced text on several lines', async () => {
    const doc = await PDFDocument.create();
    const page = doc.addPage([612, 792]);
    await drawStyledText(
      { doc, fonts: new FontCache(doc, async () => new Uint8Array()) },
      page,
      'First line Second',
      { x: 100, y: 600, width: 70, height: 60 },
      {
        font: { standard: 'Helvetica' },
        size: 11,
        color: '#000000',
        spacing: 1,
        multiline: true,
      },
    );
    const ys = new Set(
      (await textPositions(await doc.save(), 0)).map((t) => Math.round(t.y)),
    );
    expect(ys.size).toBeGreaterThanOrEqual(2);
  });

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
