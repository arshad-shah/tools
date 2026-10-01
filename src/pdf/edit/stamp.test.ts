import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import fontkit from '@pdf-lib/fontkit';
import { describe, expect, it } from 'vitest';
import {
  decodePDFRawStream,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFRawStream,
} from 'pdf-lib';
import {
  imagePlacements,
  makeRotatedPdf,
  makeTextPdf,
  pdfPageTexts,
  textPositions,
} from '../../../test/fixtures/builders';
import { encodePng, noiseImage } from '../../../test/fixtures/images';
import { stamp } from './stamp';
import { layoutInk } from './text-fit';

const font = new Uint8Array(
  readFileSync(
    createRequire(import.meta.url).resolve(
      '@fontsource/dancing-script/files/dancing-script-latin-400-normal.woff',
    ),
  ),
);
const typed = (text = 'Ada Lovelace') => ({
  kind: 'text' as const,
  text,
  fontBytes: font,
  color: '#1e3a8a',
});

describe('stamp', () => {
  it('embeds a WOFF script font (subset) and the name is extractable', async () => {
    const out = await stamp(await makeTextPdf({ pages: 2 }), {
      pageIndex: 1,
      rect: { x: 300, y: 600, width: 200, height: 60 },
      content: typed(),
    });
    const texts = await pdfPageTexts(out);
    expect(texts[1]).toContain('Ada Lovelace');
    expect(texts[0]).not.toContain('Ada');
  });
  it('fits typed text inside its box on a /Rotate 90 page, upright', async () => {
    const rect = { x: 500, y: 450, width: 220, height: 70 };
    const out = await stamp(await makeRotatedPdf(), {
      pageIndex: 1,
      rect,
      content: typed(),
    });
    const t = (await textPositions(out, 1)).find((i) =>
      i.str.startsWith('Ada'),
    )!;
    expect(t.upright).toBe(true);
    expect(t.x).toBeGreaterThanOrEqual(rect.x - 1);
    expect(t.x).toBeLessThan(rect.x + rect.width);
    expect(t.y).toBeGreaterThan(rect.y);
    expect(t.y).toBeLessThanOrEqual(rect.y + rect.height + 1);
  });
  it('places a PNG keeping its alpha as an SMask', async () => {
    const rgba = noiseImage(30, 10, 4);
    rgba[3] = 0;
    const out = await stamp(await makeTextPdf({ pages: 1 }), {
      pageIndex: 0,
      rect: { x: 72, y: 600, width: 150, height: 50 },
      content: { kind: 'image', bytes: encodePng(30, 10, rgba), format: 'png' },
    });
    const doc = await PDFDocument.load(out);
    const xo = doc
      .getPage(0)
      .node.Resources()!
      .lookup(PDFName.of('XObject'), PDFDict);
    const img = xo.lookup(xo.keys()[0]) as PDFRawStream;
    expect(img.dict.has(PDFName.of('SMask'))).toBe(true);
  });
  it('rejects boxes outside the page, empty boxes and undrawable names', async () => {
    const pdf = await makeTextPdf({ pages: 1 });
    await expect(
      stamp(pdf, {
        pageIndex: 0,
        rect: { x: 500, y: 10, width: 200, height: 50 },
        content: typed(),
      }),
    ).rejects.toThrow('The signature must sit inside the page');
    await expect(
      stamp(pdf, {
        pageIndex: 0,
        rect: { x: 10, y: 10, width: 0, height: 50 },
        content: typed(),
      }),
    ).rejects.toThrow('The signature box is empty');
    await expect(
      stamp(pdf, {
        pageIndex: 0,
        rect: { x: 10, y: 10, width: 100, height: 50 },
        content: typed('Ада'),
      }),
    ).rejects.toThrow("Your name contains characters the font can't draw");
  });
});

const fontFile = (name: string) =>
  new Uint8Array(
    readFileSync(
      createRequire(import.meta.url).resolve(
        `@fontsource/${name}/files/${name}-latin-400-normal.woff`,
      ),
    ),
  );

describe('typed text fills its box exactly (what you place is what you get)', () => {
  it.each([
    ['dancing-script', 0],
    ['great-vibes', 0], // tall flourishes beyond ascent/descent
    ['caveat', 1], // on a /Rotate 90 page
  ] as const)('%s, page %i', async (name, pageIndex) => {
    const bytes = fontFile(name);
    const rect = { x: 120, y: 300, width: 260, height: 90 };
    const text = 'Ada Lovelace';
    const out = await stamp(await makeRotatedPdf(), {
      pageIndex,
      rect,
      content: { kind: 'text', text, fontBytes: bytes, color: '#000000' },
    });
    const t = (await textPositions(out, pageIndex)).find((i) =>
      i.str.startsWith('Ada'),
    )!;
    expect(t.upright).toBe(true);
    const { ink } = layoutInk(fontkit.create(bytes), text);
    const left = t.x + ink.minX * t.size;
    const right = t.x + ink.maxX * t.size;
    const top = t.y - ink.maxY * t.size;
    const bottom = t.y - ink.minY * t.size;
    const tol = 0.5;
    expect(left).toBeGreaterThanOrEqual(rect.x - tol);
    expect(right).toBeLessThanOrEqual(rect.x + rect.width + tol);
    expect(top).toBeGreaterThanOrEqual(rect.y - tol);
    expect(bottom).toBeLessThanOrEqual(rect.y + rect.height + tol);
    // It fills the box in at least one direction, centred in the other.
    const fillsW = Math.abs(right - left - rect.width) < tol;
    const fillsH = Math.abs(bottom - top - rect.height) < tol;
    expect(fillsW || fillsH).toBe(true);
    expect((left + right) / 2).toBeCloseTo(rect.x + rect.width / 2, 0);
    expect((top + bottom) / 2).toBeCloseTo(rect.y + rect.height / 2, 0);
  });
});

describe('image stamps land where they were placed', () => {
  it('on a /Rotate 90 page: same visual box, upright', async () => {
    const rect = { x: 400, y: 100, width: 150, height: 50 };
    const out = await stamp(await makeRotatedPdf(), {
      pageIndex: 1,
      rect,
      content: {
        kind: 'image',
        bytes: encodePng(30, 10, noiseImage(30, 10, 4)),
        format: 'png',
      },
    });
    const [img] = await imagePlacements(out, 1);
    expect(img.viewport).toEqual({ width: 792, height: 612 });
    expect(img.upright).toBe(true);
    expect(img.left).toBeCloseTo(rect.x, 3);
    expect(img.top).toBeCloseTo(rect.y, 3);
    expect(img.width).toBeCloseTo(rect.width, 3);
    expect(img.height).toBeCloseTo(rect.height, 3);
  });
});

describe('typed signatures embed real glyph outlines', () => {
  it('the subset font program draws every letter of the name', async () => {
    const out = await stamp(await makeTextPdf({ pages: 1 }), {
      pageIndex: 0,
      rect: { x: 72, y: 600, width: 200, height: 60 },
      content: typed('Ada Lovelace'),
    });
    const doc = await PDFDocument.load(out);
    // The font program the FontDescriptor points at.
    const programs = [...doc.context.enumerateIndirectObjects()]
      .map(([, o]) => o)
      .filter(
        (o): o is PDFDict =>
          o instanceof PDFDict &&
          o.get(PDFName.of('Type')) === PDFName.of('FontDescriptor'),
      )
      .map((d) =>
        ['FontFile', 'FontFile2', 'FontFile3']
          .map((k) => d.lookup(PDFName.of(k)))
          .find((o) => o instanceof PDFRawStream),
      )
      .filter((x): x is PDFRawStream => x instanceof PDFRawStream);
    expect(programs).toHaveLength(1);
    const subset = fontkit.create(
      decodePDFRawStream(programs[0]).decode() as Uint8Array,
    );
    // The subset maps glyph ids, not code points; every used glyph has ink.
    const original = fontkit.create(font);
    const ids = new Set(original.layout('AdaLovelace').glyphs.map((g) => g.id));
    expect(subset.numGlyphs).toBeGreaterThanOrEqual(ids.size);
    let inked = 0;
    for (let id = 1; id < subset.numGlyphs; id++)
      if (subset.getGlyph(id).path.toSVG() !== '') inked++;
    expect(inked).toBeGreaterThanOrEqual(ids.size);
  });
});
