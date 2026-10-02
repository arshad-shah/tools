import { describe, expect, it } from 'vitest';
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { OpsTable } from '@/pdf/detect';
import {
  makeComplexPagePdf,
  makeFlatFormWord,
  makeNegativeReport,
} from '../../../test/fixtures/flat-form';
import { makeCharBoxForm } from '../../../test/fixtures/char-box-form';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { fontAdvances } from '@/pdf/detect/advance';
import {
  detectFromPage,
  fontAdvancesOf,
  summarise,
  type DetectPageLike,
} from './detect-page';

async function detect(bytes: Uint8Array, pageIndex = 0) {
  const task = getDocument({
    data: bytes.slice(),
    useSystemFonts: false,
    // As the render worker opens documents (handlers/open.ts).
    fontExtraProperties: true,
    verbosity: 0,
  });
  try {
    const page = await (await task.promise).getPage(pageIndex + 1);
    return await detectFromPage(
      page as unknown as DetectPageLike,
      pageIndex,
      OPS as unknown as OpsTable,
    );
  } finally {
    await task.destroy();
  }
}

describe('detectFromPage (render worker)', () => {
  it('finds the fields and table cells of a flat form page', async () => {
    const { bytes } = await makeFlatFormWord();
    const d = await detect(bytes);
    expect(d.skipped).toBeNull();
    expect(
      d.fields.filter((f) => f.status === 'field').length,
    ).toBeGreaterThanOrEqual(10);
    expect(d.cells.length).toBeGreaterThan(10);
    expect(d.fields.some((f) => f.label === 'Surname')).toBe(true);
  });

  it('offers a run of character boxes as one snap cell', async () => {
    const { bytes, truth } = await makeCharBoxForm();
    const d = await detect(bytes, 1);
    const surname = truth.find((t) => t.label === 'Surname')!.rect;
    const inRow = d.cells.filter(
      (c) =>
        c.y < surname.y + surname.height &&
        c.y + c.height > surname.y &&
        c.x >= surname.x - 1,
    );
    expect(inRow).toHaveLength(1);
    expect(inRow[0].width).toBeCloseTo(surname.width, 0);
  });

  it('lists the places to sign with the page detection', async () => {
    const { bytes } = await makeFlatFormWord();
    const d = await detect(bytes, 2);
    expect(d.signTargets.map((t) => [t.kind, t.label])).toEqual([
      ['signature', 'Signature'],
      ['date', 'Date'],
    ]);
  });

  it('skips a page over the path budget', async () => {
    const d = await detect(await makeComplexPagePdf());
    expect(d).toMatchObject({
      skipped: 'too-complex',
      fields: [],
      cells: [],
      signTargets: [],
    });
  });

  it('summarises sampled pages, extrapolated', async () => {
    const { bytes } = await makeFlatFormWord();
    const pages = [await detect(bytes, 0), await detect(bytes, 1)];
    const s = summarise(6, pages, { hasAcroForm: false, hasXfa: false }, true);
    expect(s.sampled).toBe(2);
    expect(s.flatForm).toBe(true);
    expect(s.estimatedFields).toBe(Math.round((s.fields / 2) * 6));
    const neg = summarise(
      1,
      [await detect(await makeNegativeReport())],
      { hasAcroForm: false, hasXfa: false },
      true,
    );
    expect(neg.flatForm).toBe(false);
  });
});

describe('fontAdvancesOf', () => {
  it("reads each font's own widths through pdf.js", async () => {
    const doc = await PDFDocument.create();
    const pg = doc.addPage([300, 200]);
    const mono = await doc.embedFont(StandardFonts.Courier);
    const serif = await doc.embedFont(StandardFonts.TimesRoman);
    pg.drawText('Wil', { x: 10, y: 100, size: 12, font: mono });
    pg.drawText('Wil', { x: 10, y: 50, size: 12, font: serif });
    const task = getDocument({
      data: await doc.save(),
      useSystemFonts: false,
      fontExtraProperties: true,
      verbosity: 0,
    });
    try {
      const page = await (await task.promise).getPage(1);
      await page.getOperatorList();
      const text = await page.getTextContent();
      const ids = text.items.map((i) => ('fontName' in i ? i.fontName : ''));
      const fonts = fontAdvancesOf(page as unknown as DetectPageLike, ids);
      const chars = Array.from('Wil');
      expect(fontAdvances(chars, fonts[ids[0]])).toEqual([600, 600, 600]);
      expect(fontAdvances(chars, fonts[ids[1]])).toEqual([944, 278, 278]);
    } finally {
      await task.destroy();
    }
  });

  it('leaves out a font it cannot read', () => {
    const page = {
      commonObjs: {
        has: () => true,
        get: () => ({ widths: {}, defaultWidth: 0 }),
      },
    };
    expect(fontAdvancesOf(page, ['f1'])).toEqual({});
  });
});
