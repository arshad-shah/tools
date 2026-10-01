import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { makeTextPdf, pdfPageTexts } from '../../../test/fixtures/builders';
import { applyPageEdits, extract, merge, split } from './ops';

const rotations = async (bytes: Uint8Array) =>
  (await PDFDocument.load(bytes)).getPages().map((p) => p.getRotation().angle);

describe('merge', () => {
  it('concatenates documents in order', async () => {
    const a = await makeTextPdf({ pages: 2, label: 'A' });
    const b = await makeTextPdf({ pages: 1, label: 'B' });
    expect(
      await pdfPageTexts(await merge([{ bytes: a }, { bytes: b }])),
    ).toEqual(['A 1', 'A 2', 'B 1']);
  });
  it('honours per-input page subsets', async () => {
    const a = await makeTextPdf({ pages: 3, label: 'A' });
    const b = await makeTextPdf({ pages: 2, label: 'B' });
    const out = await merge([
      { bytes: a, pages: [2, 0] },
      { bytes: b, pages: [1] },
    ]);
    expect(await pdfPageTexts(out)).toEqual(['A 3', 'A 1', 'B 2']);
  });
  it('requires at least one input', async () => {
    await expect(merge([])).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });
});

describe('extract / split', () => {
  it('extracts pages in the given order', async () => {
    const src = await makeTextPdf({ pages: 4, label: 'P' });
    expect(await pdfPageTexts(await extract(src, [3, 1]))).toEqual([
      'P 4',
      'P 2',
    ]);
  });
  it('rejects empty or out-of-range indices', async () => {
    const src = await makeTextPdf({ pages: 2 });
    await expect(extract(src, [])).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    });
    await expect(extract(src, [2])).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    });
  });
  it('splits into one document per range', async () => {
    const src = await makeTextPdf({ pages: 5, label: 'S' });
    const parts = await split(src, [
      { start: 0, end: 1 },
      { start: 4, end: 4 },
    ]);
    expect(parts).toHaveLength(2);
    expect(await pdfPageTexts(parts[0])).toEqual(['S 1', 'S 2']);
    expect(await pdfPageTexts(parts[1])).toEqual(['S 5']);
  });
});

describe('applyPageEdits', () => {
  it('reorders, deletes and rotates in one pass', async () => {
    const src = await makeTextPdf({ pages: 3, label: 'O' });
    const out = await applyPageEdits(src, [
      { source: 2, rotate: 90 },
      { source: 0, rotate: 0 },
    ]);
    expect(await pdfPageTexts(out)).toEqual(['O 3', 'O 1']);
    expect(await rotations(out)).toEqual([90, 0]);
  });
  it('adds to existing rotation modulo 360', async () => {
    const once = await applyPageEdits(await makeTextPdf({ pages: 1 }), [
      { source: 0, rotate: 270 },
    ]);
    const twice = await applyPageEdits(once, [{ source: 0, rotate: 180 }]);
    expect(await rotations(twice)).toEqual([90]);
  });
  it('refuses to produce an empty document', async () => {
    await expect(
      applyPageEdits(await makeTextPdf({ pages: 1 }), []),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });
});
