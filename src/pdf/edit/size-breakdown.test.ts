import { describe, expect, it } from 'vitest';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import {
  makeImageHeavyPdf,
  makeTextPdf,
} from '../../../test/fixtures/builders';
import { sizeBreakdown } from './size-breakdown';

describe('sizeBreakdown', () => {
  it('attributes most of an image-heavy file to images and sums to the total', async () => {
    const bytes = await makeImageHeavyPdf();
    const b = await sizeBreakdown(bytes);
    expect(b.total).toBe(bytes.length);
    expect(b.images + b.fonts + b.content + b.other).toBe(b.total);
    expect(b.images / b.total).toBeGreaterThan(0.8);
    expect(b.other).toBeGreaterThanOrEqual(0);
    expect(b.largestImages.length).toBeGreaterThan(0);
    const sizes = b.largestImages.map((i) => i.bytes);
    expect(sizes).toEqual([...sizes].sort((x, y) => y - x));
    expect(b.largestImages[0]).toMatchObject({ width: 1000, height: 750 });
    for (const i of b.largestImages) {
      expect(i.page).toBeGreaterThanOrEqual(0);
      expect(i.page).toBeLessThan(4);
    }
  });

  it('counts page content and lists standard fonts as not embedded', async () => {
    const bytes = await makeTextPdf({ pages: 3 });
    const b = await sizeBreakdown(bytes);
    expect(b.images).toBe(0);
    expect(b.content).toBeGreaterThan(0);
    expect(b.images + b.fonts + b.content + b.other).toBe(b.total);
    expect(b.fontList.length).toBeGreaterThan(0);
    expect(b.fontList.every((f) => !f.embedded && f.bytes === 0)).toBe(true);
  });

  it('measures embedded font programs and recognises subsets', async () => {
    const require = createRequire(import.meta.url);
    const fontPath =
      require.resolve('@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff');
    const doc = await PDFDocument.create();
    doc.registerFontkit(fontkit);
    // pdf-lib does not write the subset tag itself; give it the usual one.
    const font = await doc.embedFont(readFileSync(fontPath), {
      subset: true,
      customName: 'ABCDEF+NotoSans',
    });
    const helv = await doc.embedFont(StandardFonts.Helvetica);
    const page = doc.addPage([300, 300]);
    page.drawText('Hello subset', { x: 20, y: 200, font, size: 18 });
    page.drawText('Standard', { x: 20, y: 100, font: helv, size: 18 });
    const bytes = await doc.save();
    const b = await sizeBreakdown(bytes);
    const embedded = b.fontList.filter((f) => f.embedded);
    expect(embedded).toHaveLength(1);
    expect(embedded[0].subset).toBe(true);
    expect(embedded[0].bytes).toBeGreaterThan(0);
    expect(b.fonts).toBe(embedded[0].bytes);
    expect(b.fontList.some((f) => f.name === 'Helvetica' && !f.embedded)).toBe(
      true,
    );
  });
});
