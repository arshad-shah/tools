import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { PDFDict, PDFDocument, PDFName, PDFRawStream } from 'pdf-lib';
import {
  makeRotatedPdf,
  makeTextPdf,
  pdfPageTexts,
  textPositions,
} from '../../../test/fixtures/builders';
import { encodePng, noiseImage } from '../../../test/fixtures/images';
import { stamp } from './stamp';

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
