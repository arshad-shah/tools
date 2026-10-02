import { describe, expect, it } from 'vitest';
import { PDFArray, PDFDocument, PDFName, PDFNumber } from 'pdf-lib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import {
  decodedObjects,
  makeStructuredPdf,
  makeTextPdf,
  pdfPageTexts,
} from '../../../test/fixtures/builders';
import { rebuildingSave } from './ops';
import { arrangePages, setPageLabels, type PageLabelRange } from './pages';

/** pdf-lib draws Helvetica text as a hex string. */
const hexOf = (s: string) =>
  Array.from(new TextEncoder().encode(s), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');

const boxOf = (doc: PDFDocument, pageIndex: number, key: string) => {
  const arr = doc
    .getPage(pageIndex)
    .node.lookupMaybe(PDFName.of(key), PDFArray);
  return arr?.asArray().map((n) => (n as PDFNumber).asNumber());
};

async function labelsOf(bytes: Uint8Array): Promise<string[] | null> {
  const task = getDocument({ data: bytes.slice(), verbosity: 0 });
  try {
    return await (await task.promise).getPageLabels();
  } finally {
    await task.destroy();
  }
}

describe('arrangePages', () => {
  it('reorders, inserts a blank page, rotates and drops the deleted page', async () => {
    const src = await makeTextPdf({ pages: 3, label: 'T', size: [500, 700] });
    expect(await decodedObjects(src)).toMatch(new RegExp(hexOf('T 2'), 'i'));
    const doc = await PDFDocument.load(src);
    const [p0, , p2] = doc.getPages();
    const result = await arrangePages(doc, [
      { page: p2, rotate: 0 },
      { page: { blank: { width: 612, height: 792 } }, rotate: 0 },
      { page: p0, rotate: 90 },
    ]);
    expect(result.pages).toHaveLength(3);
    expect(result.pages[0]).toBe(p2);
    expect(result.pages[2]).toBe(p0);
    // The document's own page list matches what was arranged.
    const listed = doc.getPages();
    expect(listed).toHaveLength(3);
    expect(listed.every((p, i) => p === result.pages[i])).toBe(true);
    expect(result.notes).toEqual([]);

    const out = await rebuildingSave(doc);
    const reloaded = await PDFDocument.load(out);
    expect(
      reloaded.getPages().map((p) => {
        const { width, height } = p.getSize();
        return [width, height, p.getRotation().angle];
      }),
    ).toEqual([
      [500, 700, 0],
      [612, 792, 0],
      [500, 700, 90],
    ]);
    expect(await pdfPageTexts(out)).toEqual(['T 3', '', 'T 1']);
    expect(reloaded.getPage(1).node.get(PDFName.of('Contents'))).toBe(
      undefined,
    );
    expect(await decodedObjects(out)).not.toMatch(
      new RegExp(hexOf('T 2'), 'i'),
    );
  });

  it('sets the CropBox exactly and clamps it inside the MediaBox', async () => {
    const doc = await PDFDocument.load(await makeTextPdf({ pages: 2 }));
    const [p0, p1] = doc.getPages();
    await arrangePages(doc, [
      {
        page: p0,
        rotate: 0,
        crop: { x: 10.5, y: 20, width: 300, height: 400 },
      },
      {
        page: p1,
        rotate: 0,
        crop: { x: -50, y: 700, width: 800, height: 300 },
      },
    ]);
    const out = await PDFDocument.load(await rebuildingSave(doc));
    expect(boxOf(out, 0, 'CropBox')).toEqual([10.5, 20, 310.5, 420]);
    expect(boxOf(out, 1, 'CropBox')).toEqual([0, 700, 612, 792]);
  });

  it('rejects a crop that misses the page', async () => {
    const doc = await PDFDocument.load(await makeTextPdf({ pages: 1 }));
    await expect(
      arrangePages(doc, [
        {
          page: doc.getPage(0),
          rotate: 0,
          crop: { x: 700, y: 0, width: 10, height: 10 },
        },
      ]),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });

  it('changes the MediaBox without scaling the content', async () => {
    const doc = await PDFDocument.load(await makeTextPdf({ pages: 1 }));
    const before = await decodedObjects(await doc.save());
    const page = doc.getPage(0);
    page.setCropBox(0, 0, 600, 780);
    await arrangePages(doc, [
      { page, rotate: 0, size: { width: 842, height: 720 } },
    ]);
    const out = await rebuildingSave(doc);
    const reloaded = await PDFDocument.load(out);
    expect(boxOf(reloaded, 0, 'MediaBox')).toEqual([0, 0, 842, 720]);
    // The old CropBox belonged to the old size.
    expect(boxOf(reloaded, 0, 'CropBox')).toBeUndefined();
    // Same drawing, no scaling operator added.
    const text = hexOf('Page 1');
    expect(before).toMatch(new RegExp(text, 'i'));
    expect(await decodedObjects(out)).toMatch(new RegExp(text, 'i'));
    expect(await pdfPageTexts(out)).toEqual(['Page 1']);
  });

  it('copies a page used twice and keeps the first use as the original', async () => {
    const doc = await PDFDocument.load(await makeTextPdf({ pages: 2 }));
    const [p0, p1] = doc.getPages();
    const { pages } = await arrangePages(doc, [
      { page: p0, rotate: 0 },
      { page: p1, rotate: 0 },
      { page: p0, rotate: 180 },
    ]);
    expect(pages[0]).toBe(p0);
    expect(pages[2]).not.toBe(p0);
    const out = await rebuildingSave(doc);
    expect(await pdfPageTexts(out)).toEqual(['Page 1', 'Page 2', 'Page 1']);
    expect(
      (await PDFDocument.load(out))
        .getPages()
        .map((p) => p.getRotation().angle),
    ).toEqual([0, 0, 180]);
  });

  it('validates its entries', async () => {
    const doc = await PDFDocument.load(await makeTextPdf({ pages: 1 }));
    const other = await PDFDocument.load(await makeTextPdf({ pages: 1 }));
    await expect(arrangePages(doc, [])).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    });
    await expect(
      arrangePages(doc, [{ page: doc.getPage(0), rotate: 45 as 0 }]),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(
      arrangePages(doc, [{ page: other.getPage(0), rotate: 0 }]),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(
      arrangePages(doc, [
        { page: { blank: { width: 0, height: 10 } }, rotate: 0 },
      ]),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });

  it('removes page labels when pages move, and says so', async () => {
    const doc = await PDFDocument.load(await makeStructuredPdf(2));
    const [p0, p1] = doc.getPages();
    const { notes } = await arrangePages(doc, [
      { page: p1, rotate: 0 },
      { page: p0, rotate: 0 },
    ]);
    expect(notes).toEqual([expect.stringMatching(/page labels were removed/i)]);
    expect(await labelsOf(await rebuildingSave(doc))).toBeNull();
  });
});

describe('setPageLabels', () => {
  it('writes a /PageLabels number tree that pdf.js reads back', async () => {
    const doc = await PDFDocument.load(await makeTextPdf({ pages: 6 }));
    const ranges: PageLabelRange[] = [
      { start: 0, style: 'r' },
      { start: 2, style: 'D' },
      { start: 4, style: 'A', prefix: 'App-', first: 3 },
    ];
    setPageLabels(doc, ranges);
    expect(await labelsOf(await rebuildingSave(doc))).toEqual([
      'i',
      'ii',
      '1',
      '2',
      'App-C',
      'App-D',
    ]);
  });

  it('labels with a prefix only when the style is null', async () => {
    const doc = await PDFDocument.load(await makeTextPdf({ pages: 2 }));
    setPageLabels(doc, [
      { start: 0, style: null, prefix: 'Cover' },
      { start: 1, style: 'a' },
    ]);
    expect(await labelsOf(await rebuildingSave(doc))).toEqual(['Cover', 'a']);
  });

  it('removes labels with null, and replaces labels after arrangePages', async () => {
    const doc = await PDFDocument.load(await makeStructuredPdf(2));
    setPageLabels(doc, null);
    expect(await labelsOf(await rebuildingSave(doc))).toBeNull();

    const moved = await PDFDocument.load(await makeStructuredPdf(2));
    const [p0, p1] = moved.getPages();
    await arrangePages(moved, [
      { page: p1, rotate: 0 },
      { page: p0, rotate: 0 },
    ]);
    setPageLabels(moved, [{ start: 0, style: 'R' }]);
    expect(await labelsOf(await rebuildingSave(moved))).toEqual(['I', 'II']);
  });

  it('drops ranges that start past the last page', async () => {
    const doc = await PDFDocument.load(await makeTextPdf({ pages: 3 }));
    setPageLabels(doc, [
      { start: 0, style: 'D' },
      { start: 2, style: 'r' },
      { start: 3, style: 'A' },
      { start: 7, style: 'a' },
    ]);
    expect(await labelsOf(await rebuildingSave(doc))).toEqual(['1', '2', 'i']);
  });

  it('rejects ranges that do not start at the first page or overlap', async () => {
    const doc = await PDFDocument.load(await makeTextPdf({ pages: 3 }));
    expect(() => setPageLabels(doc, [{ start: 1, style: 'D' }])).toThrow(
      expect.objectContaining({ code: 'INVALID_INPUT' }),
    );
    expect(() =>
      setPageLabels(doc, [
        { start: 0, style: 'D' },
        { start: 0, style: 'r' },
      ]),
    ).toThrow(expect.objectContaining({ code: 'INVALID_INPUT' }));
    expect(() =>
      setPageLabels(doc, [{ start: 0, style: 'D', first: 0 }]),
    ).toThrow(expect.objectContaining({ code: 'INVALID_INPUT' }));
  });
});
