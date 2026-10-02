import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { imagePlacements, pdfPageTexts } from './builders';
import {
  makeFlatFormStroked,
  makeFlatFormWord,
  makeMixedAcroform,
  makeNegativeReport,
  makeScanForm,
} from './flat-form';

describe('flat-form fixtures', () => {
  it('builds six pages with truth on every page, the last one rotated', async () => {
    for (const make of [makeFlatFormWord, makeFlatFormStroked]) {
      const { bytes, truth } = await make();
      const doc = await PDFDocument.load(bytes);
      expect(doc.getPageCount()).toBe(6);
      expect(doc.getPage(5).getRotation().angle).toBe(90);
      expect(new Set(truth.map((t) => t.page))).toEqual(
        new Set([0, 1, 2, 3, 4, 5]),
      );
      expect(truth.filter((t) => t.type === 'tick')).toHaveLength(5);
      expect(truth.filter((t) => t.prechecked)).toHaveLength(1);
      for (const t of truth) {
        expect(t.rect.width).toBeGreaterThan(0);
        expect(t.rect.height).toBeGreaterThan(0);
      }
    }
  });

  it('writes the checkbox glyphs as real text', async () => {
    const { bytes } = await makeFlatFormWord();
    const [, , , checkboxes] = await pdfPageTexts(bytes);
    expect(checkboxes).toContain(String.fromCodePoint(0x2610));
    expect(checkboxes).toContain(String.fromCodePoint(0x2612));
  });

  it('builds the negative report and the mixed AcroForm', async () => {
    const report = await PDFDocument.load(await makeNegativeReport());
    expect(report.getForm().getFields()).toHaveLength(0);
    const mixed = await makeMixedAcroform();
    const doc = await PDFDocument.load(mixed.bytes);
    expect(doc.getForm().getFields()).toHaveLength(4);
    expect(mixed.truth).toHaveLength(4);
  });

  it('renders the scan form as a single image with no text', async () => {
    const bytes = await makeScanForm();
    const [text] = await pdfPageTexts(bytes);
    expect(text.trim()).toBe('');
    const placements = await imagePlacements(bytes, 0);
    expect(placements).toHaveLength(1);
  });
});
