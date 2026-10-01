import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  makeEncryptMarkedPdf,
  makeShapesOnlyPdf,
  makeTextPdf,
  pdfPageTexts,
} from './builders';

describe('fixture builders', () => {
  it('makeTextPdf creates labelled pages', async () => {
    const bytes = await makeTextPdf({ pages: 3, label: 'Doc' });
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(3);
    expect(doc.getTitle()).toBe('Doc fixture');
    expect(await pdfPageTexts(bytes)).toEqual(['Doc 1', 'Doc 2', 'Doc 3']);
  });
  it('makeShapesOnlyPdf has no text', async () => {
    expect(await pdfPageTexts(await makeShapesOnlyPdf(2))).toEqual(['', '']);
  });
  it('makeEncryptMarkedPdf is detected as encrypted by pdf-lib', async () => {
    await expect(
      PDFDocument.load(await makeEncryptMarkedPdf()),
    ).rejects.toThrow(/encrypted/i);
  });
});
