import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';
import { degrees, PDFDocument, StandardFonts } from 'pdf-lib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import {
  decodedObjects,
  imagePlacements,
  pdfPageTexts,
  textPositions,
} from '../../../test/fixtures/builders';
import { encodePng, noiseImage } from '../../../test/fixtures/images';
import {
  drawBox,
  drawCross,
  drawEllipse,
  drawImage,
  drawLine,
  drawPath,
  drawText,
  drawTick,
  fitText,
  type Box,
  type DrawCtx,
} from './draw';
import { FontCache } from './font-cache';

const notoPath = createRequire(import.meta.url).resolve(
  '@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff',
);
const loadNoto = () => Promise.resolve(new Uint8Array(readFileSync(notoPath)));

async function setup(rotate = 0) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  page.setRotation(degrees(rotate));
  const ctx: DrawCtx = { doc, fonts: new FontCache(doc, loadNoto) };
  return { doc, page, ctx };
}

const helvetica = { standard: 'Helvetica' } as const;
const black = '#000000';

/** The page area a box covers once turned `deg` about its centre (multiples of 90). */
function footprint(box: Box, deg: number): Box {
  if (deg % 180 === 0) return box;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  return {
    x: cx - box.height / 2,
    y: cy - box.width / 2,
    width: box.height,
    height: box.width,
  };
}

/** A user-space box as a viewer shows it: pdf.js viewport, scale 1, y down. */
async function onScreen(bytes: Uint8Array, box: Box) {
  const task = getDocument({ data: bytes.slice(), verbosity: 0 });
  try {
    const page = await (await task.promise).getPage(1);
    const viewport = page.getViewport({ scale: 1 });
    const [x1, y1] = viewport.convertToViewportPoint(box.x, box.y);
    const [x2, y2] = viewport.convertToViewportPoint(
      box.x + box.width,
      box.y + box.height,
    );
    return {
      left: Math.min(x1, x2),
      right: Math.max(x1, x2),
      top: Math.min(y1, y2),
      bottom: Math.max(y1, y2),
    };
  } finally {
    await task.destroy();
  }
}

describe('fitText', () => {
  it('wraps multiline text inside the box at the largest size that fits', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const box = { x: 0, y: 0, width: 60, height: 40 };
    const fit = fitText(font, 'one two three four five six', box, {
      size: 12,
      minSize: 6,
      multiline: true,
    });
    expect(fit.truncated).toBe(false);
    expect(fit.lines.length).toBeGreaterThan(1);
    expect(fit.lines.join(' ')).toBe('one two three four five six');
    for (const line of fit.lines)
      expect(font.widthOfTextAtSize(line, fit.size)).toBeLessThanOrEqual(60);
    expect(fit.lines.length * fit.size * 1.2).toBeLessThanOrEqual(40);
  });
  it("sizes 'auto' text from the box height", async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fit = fitText(
      font,
      'Hi',
      { x: 0, y: 0, width: 200, height: 24 },
      {
        size: 'auto',
        minSize: 6,
        multiline: false,
      },
    );
    expect(fit.size).toBeCloseTo(20, 1);
    expect(fit.lines).toEqual(['Hi']);
  });
  it('cuts lines that cannot fit at the minimum size', async () => {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fit = fitText(
      font,
      'a long line\nsecond\nthird\nfourth',
      { x: 0, y: 0, width: 200, height: 20 },
      { size: 10, minSize: 10, multiline: true },
    );
    expect(fit).toEqual({ size: 10, lines: ['a long line'], truncated: true });
  });
});

describe('drawText', () => {
  it("shrinks text to fit a 100x12 box with fit 'shrink'", async () => {
    const { page, ctx } = await setup();
    const fit = await drawText(
      ctx,
      page,
      'Hello world',
      { x: 72, y: 600, width: 100, height: 12 },
      { font: helvetica, size: 24, color: black, fit: 'shrink' },
    );
    expect(fit.size).toBeLessThanOrEqual(12 / 1.2);
    expect(fit.truncated).toBe(false);
    expect(fit.lines).toEqual(['Hello world']);
  });

  it('reports truncated text when even the minimum size is too large', async () => {
    const { doc, page, ctx } = await setup();
    const text = 'Lorem ipsum dolor sit amet '.repeat(10).trim();
    const fit = await drawText(
      ctx,
      page,
      text,
      { x: 72, y: 600, width: 100, height: 12 },
      { font: helvetica, size: 12, color: black, fit: 'shrink', minSize: 6 },
    );
    expect(fit).toMatchObject({ size: 6, truncated: true });
    const [drawn] = await pdfPageTexts(await doc.save());
    expect(text.startsWith(drawn)).toBe(true);
    expect(drawn.length).toBeLessThan(text.length);
  });

  it('keeps the size with the default fit and still keeps text inside the box', async () => {
    const { page, ctx } = await setup();
    const fit = await drawText(
      ctx,
      page,
      'Fixed size text',
      { x: 72, y: 600, width: 40, height: 20 },
      { font: helvetica, size: 12, color: black },
    );
    expect(fit.size).toBe(12);
    expect(fit.truncated).toBe(true);
  });

  it('draws Unicode text with the embedded Noto Sans and maps it back', async () => {
    const { doc, page, ctx } = await setup();
    const text = `Kad${String.fromCodePoint(0x131)}k${String.fromCodePoint(0xf6)}y Caf${String.fromCodePoint(0xe9)}`;
    await drawText(
      ctx,
      page,
      text,
      { x: 72, y: 600, width: 300, height: 24 },
      { font: { unicode: true }, size: 14, color: '#1e3a8a' },
    );
    expect(await pdfPageTexts(await doc.save())).toEqual([text]);
  });

  it('names characters a standard font cannot draw', async () => {
    const { page, ctx } = await setup();
    const odd = String.fromCodePoint(0x131);
    await expect(
      drawText(
        ctx,
        page,
        `Kad${odd}k`,
        { x: 0, y: 0, width: 100, height: 20 },
        {
          font: helvetica,
          size: 10,
          color: black,
        },
      ),
    ).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      message: expect.stringContaining(odd),
    });
  });

  it('rejects a colour that is not #rrggbb', async () => {
    const { page, ctx } = await setup();
    await expect(
      drawText(
        ctx,
        page,
        'x',
        { x: 0, y: 0, width: 100, height: 20 },
        {
          font: helvetica,
          size: 10,
          color: 'red',
        },
      ),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });
});

describe('drawings on a page with /Rotate 90', () => {
  it('text turned with the page reads upright and lands inside its box', async () => {
    const { doc, page, ctx } = await setup(90);
    const box = { x: 250, y: 300, width: 200, height: 24 };
    await drawText(ctx, page, 'Upright', box, {
      font: helvetica,
      size: 14,
      color: black,
      rotate: 90,
    });
    const bytes = await doc.save();
    const [pos] = await textPositions(bytes, 0);
    expect(pos).toMatchObject({ str: 'Upright', upright: true });
    const area = await onScreen(bytes, footprint(box, 90));
    expect(pos.x).toBeGreaterThanOrEqual(area.left - 0.01);
    expect(pos.x).toBeLessThanOrEqual(area.right);
    // pos.y is the baseline: inside the box, above its bottom edge.
    expect(pos.y).toBeGreaterThan(area.top);
    expect(pos.y).toBeLessThanOrEqual(area.bottom + 0.01);
  });

  it('an image turned with the page fills its box upright', async () => {
    const { doc, page, ctx } = await setup(90);
    const box = { x: 100, y: 200, width: 120, height: 60 };
    const png = encodePng(12, 6, noiseImage(12, 6, 4));
    await drawImage(ctx, page, png, 'image/png', box, { rotate: 90 });
    const bytes = await doc.save();
    const [placed] = await imagePlacements(bytes, 0);
    const area = await onScreen(bytes, footprint(box, 90));
    expect(placed.upright).toBe(true);
    expect(placed.left).toBeCloseTo(area.left, 3);
    expect(placed.top).toBeCloseTo(area.top, 3);
    expect(placed.left + placed.width).toBeCloseTo(area.right, 3);
    expect(placed.top + placed.height).toBeCloseTo(area.bottom, 3);
  });
});

describe('vector marks', () => {
  it('drawTick writes a stroked path and no text', async () => {
    const { doc, page } = await setup();
    drawTick(page, { x: 100, y: 100, width: 12, height: 12 }, '#000000');
    const bytes = await doc.save();
    expect(await pdfPageTexts(bytes)).toEqual(['']);
    const content = await decodedObjects(bytes);
    expect(content).not.toMatch(/\bBT\b|\bTj\b/);
    expect(content).toMatch(/\bm\b[\s\S]*\bl\b[\s\S]*\bS\b/);
  });

  it('drawCross writes two stroked lines and no text', async () => {
    const { doc, page } = await setup();
    drawCross(page, { x: 100, y: 100, width: 12, height: 12 }, '#cc0000');
    const bytes = await doc.save();
    expect(await pdfPageTexts(bytes)).toEqual(['']);
    const content = await decodedObjects(bytes);
    expect(content).not.toMatch(/\bBT\b/);
    expect(content.match(/\bm\b/g)).toHaveLength(2);
  });
});

describe('shapes', () => {
  it('drawBox fills and strokes, with opacity through an ExtGState', async () => {
    const { doc, page } = await setup();
    drawBox(
      page,
      { x: 10, y: 20, width: 100, height: 50 },
      {
        fill: '#ff0000',
        stroke: '#0000ff',
        width: 2,
        opacity: 0.5,
      },
    );
    const content = await decodedObjects(await doc.save());
    expect(content).toMatch(/\/ca 0\.5/);
    expect(content).toMatch(/11 21 98 48 re/); // stroke kept inside the box
    expect(content).toMatch(/\bB\b/);
  });

  it('drawBox with a radius draws curves, and needs a fill or a stroke', async () => {
    const { doc, page } = await setup();
    drawBox(
      page,
      { x: 0, y: 0, width: 40, height: 20 },
      {
        fill: '#00ff00',
        radius: 4,
      },
    );
    expect(await decodedObjects(await doc.save())).toMatch(/\bc\b/);
    expect(() =>
      drawBox(page, { x: 0, y: 0, width: 4, height: 4 }, {}),
    ).toThrow(expect.objectContaining({ code: 'INVALID_INPUT' }));
  });

  it('drawEllipse draws four curves', async () => {
    const { doc, page } = await setup();
    drawEllipse(page, { x: 0, y: 0, width: 40, height: 20 }, { stroke: black });
    const content = await decodedObjects(await doc.save());
    expect(content.match(/\bc\b/g)).toHaveLength(4);
  });

  it('drawLine with an arrow head fills a triangle at the end', async () => {
    const { doc, page } = await setup();
    drawLine(page, [10, 10], [110, 10], {
      color: black,
      width: 2,
      arrowEnd: true,
    });
    const content = await decodedObjects(await doc.save());
    expect(content).toMatch(/\bS\b/);
    expect(content).toMatch(/110 10 m/);
    expect(content).toMatch(/\bf\b/);
  });

  it('drawPath reads SVG path data in page space', async () => {
    const { doc, page } = await setup();
    drawPath(page, 'M10 10 L100 10 l0 90 h-90 z', {
      fill: '#123456',
      evenOdd: true,
    });
    drawPath(
      page,
      'M0 0 a10 10 0 0 1 20 0 Q 30 10 40 0 T 60 0 C 1 2 3 4 5 6 S 7 8 9 9',
      {
        stroke: black,
        transform: [1, 0, 0, 1, 50, 50],
      },
    );
    const content = await decodedObjects(await doc.save());
    expect(content).toMatch(/10 10 m\s+100 10 l\s+100 100 l\s+10 100 l\s+h/);
    expect(content).toMatch(/f\*/);
    expect(content).toMatch(/1 0 0 1 50 50 cm/);
    expect(content.match(/\bc\b/g)!.length).toBeGreaterThanOrEqual(5);
  });

  it('drawPath rejects path data it cannot read', async () => {
    const { page } = await setup();
    expect(() => drawPath(page, 'M 10 10 X 4', { stroke: black })).toThrow(
      expect.objectContaining({ code: 'INVALID_INPUT' }),
    );
  });
});

describe('FontCache', () => {
  it('embeds each font once and loads the Unicode font once', async () => {
    const doc = await PDFDocument.create();
    const loader = vi.fn(loadNoto);
    const fonts = new FontCache(doc, loader);
    const [a, b] = await Promise.all([
      fonts.get({ unicode: true }),
      fonts.get({ unicode: true }),
    ]);
    expect(a).toBe(b);
    expect(loader).toHaveBeenCalledTimes(1);
    const h1 = await fonts.get(helvetica);
    expect(await fonts.get({ standard: 'Helvetica' })).toBe(h1);
    expect(await fonts.get({ standard: 'Courier' })).not.toBe(h1);
    const custom = await fonts.get({
      custom: 'noto',
      bytes: await loadNoto(),
    });
    expect(custom).not.toBe(a);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('reports a font that cannot be embedded as INVALID_FILE', async () => {
    const doc = await PDFDocument.create();
    const fonts = new FontCache(doc, loadNoto);
    await expect(
      fonts.get({ custom: 'bad', bytes: new Uint8Array([1, 2, 3, 4]) }),
    ).rejects.toMatchObject({ code: 'INVALID_FILE' });
  });
});
