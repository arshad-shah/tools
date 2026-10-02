import { beforeAll, describe, expect, it, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { makeTextPdf, pdfPageTexts } from '../../../test/fixtures/builders';
import { encodePng } from '../../../test/fixtures/images';
import { BlobStore } from '@/pdf/doc/blob-store';
import { registerCoreOperations } from '@/pdf/doc/ops';
import { inProcessServices } from '@/pdf/doc/test-services';
import { makeModel, makeSource, makeState } from '@/pdf/doc/test-helpers';
import type { Services } from '@/pdf/doc/services';
import { imagesToPdf } from '@/pdf/edit/images';
import { textItemsFrom } from '@/pdf/render/text';
import type { PageImageOptions } from '@/pdf/render';
import {
  exportImages,
  exportMarkdown,
  exportText,
  imagesAsPdf,
  materializeView,
} from './exports';
import { MARKDOWN_NOTICE } from './markdown';

type PdfDoc = Awaited<ReturnType<typeof getDocument>['promise']>;

/** pdf.js in Node standing in for the render worker; images are stubs. */
function nodeRender() {
  const docs = new Map<string, { pdf: PdfDoc; destroy: () => Promise<void> }>();
  const closed: string[] = [];
  let n = 0;
  const render = {
    async open(bytes: Uint8Array) {
      const task = getDocument({
        data: bytes.slice(),
        useSystemFonts: false,
        verbosity: 0,
      });
      const pdf = await task.promise;
      const docId = `d${n++}`;
      docs.set(docId, { pdf, destroy: () => task.destroy() });
      return { docId, pageCount: pdf.numPages, pages: [] };
    },
    async textItems(docId: string, i: number) {
      const page = await docs.get(docId)!.pdf.getPage(i + 1);
      return textItemsFrom(
        await page.getTextContent({ includeMarkedContent: false }),
      );
    },
    async renderPageImage(_docId: string, i: number, o: PageImageOptions) {
      const capped = o.dpi > 150;
      return {
        bytes: Uint8Array.of(i),
        width: 10,
        height: 10,
        dpi: capped ? 150 : o.dpi,
        capped,
      };
    },
    async close(docId: string) {
      closed.push(docId);
      await docs.get(docId)?.destroy();
      docs.delete(docId);
    },
  };
  return { render: render as unknown as Services['render'], closed };
}

async function setup(pages = 3) {
  const model = makeModel(makeState(pages));
  const blobs = new BlobStore(null, 'doc1');
  blobs.addCheckpoint(
    model.currentCheckpoint(),
    await makeTextPdf({ pages, label: 'Alpha' }),
  );
  const { render, closed } = nodeRender();
  return { model, blobs, services: inProcessServices({ render }), closed };
}

beforeAll(() => registerCoreOperations());

describe('convert exports', () => {
  it('materialises the current view once, pending changes included', async () => {
    const { model, blobs, services } = await setup();
    model.dispatch({ type: 'page.delete', params: { pageIds: ['ckpt0:1'] } });
    const bytes = await materializeView(model, blobs, null, { services });
    expect(await pdfPageTexts(bytes)).toEqual(['Alpha 1', 'Alpha 3']);
  });

  it('exports text per page with page headings and closes the document', async () => {
    const { model, blobs, services, closed } = await setup(2);
    const r = await exportText(model, blobs, null, { services });
    expect(r.text).toBe('--- Page 1 ---\nAlpha 1\n\n--- Page 2 ---\nAlpha 2\n');
    expect(r.emptyPages).toEqual([]);
    expect(closed).toHaveLength(1);
  });

  it('exports Markdown of the selected pages only', async () => {
    const { model, blobs, services } = await setup(3);
    const r = await exportMarkdown(model, blobs, ['ckpt0:2'], { services });
    expect(r.markdown.startsWith(MARKDOWN_NOTICE)).toBe(true);
    expect(r.markdown).toContain('Alpha 3');
    expect(r.markdown).not.toContain('Alpha 1');
  });

  it('writes the detected table cells of a page as a GFM table', async () => {
    const { model, blobs } = await setup(1);
    const { render } = nodeRender();
    // "Alpha 1" is drawn near the top left: a 2 x 2 grid around it.
    const grid = [0, 1].flatMap((r) =>
      [0, 1].map((c) => ({
        x: 40 + 200 * c,
        y: 690 - 40 * r,
        width: 200,
        height: 40,
      })),
    );
    const detect = vi.fn(async () => ({ cells: grid }));
    const services = inProcessServices({
      render: { ...render, detect } as unknown as Services['render'],
    });
    const r = await exportMarkdown(model, blobs, null, { services });
    expect(detect).toHaveBeenCalledTimes(1);
    expect(r.markdown).toContain('| --- | --- |');
  });

  it('names images by view page number and reports capped resolution', async () => {
    const { model, blobs, services } = await setup(3);
    const r = await exportImages(
      model,
      blobs,
      ['ckpt0:0', 'ckpt0:2'],
      { format: 'jpeg', dpi: 300, quality: 0.9 },
      { services },
    );
    expect(r.files.map((f) => f.name)).toEqual([
      'a.page-1.jpg',
      'a.page-3.jpg',
    ]);
    expect(r.capped).toEqual([
      { page: 1, dpi: 150 },
      { page: 3, dpi: 150 },
    ]);
  });

  it('hands each image to the sink as it is rendered and keeps none', async () => {
    const { model, blobs, services } = await setup(2);
    const seen: string[] = [];
    const r = await exportImages(
      model,
      blobs,
      null,
      { format: 'png', dpi: 72, quality: 0.9 },
      { services },
      (f) => void seen.push(f.name),
    );
    expect(seen).toEqual(['a.page-1.png', 'a.page-2.png']);
    expect(r.files).toEqual([]);
  });

  it('reports pages without a text layer', async () => {
    const { model, blobs, services } = await setup(1);
    model.dispatch({
      type: 'page.insertBlank',
      params: { at: 1, newId: 'b1', width: 200, height: 200 },
    });
    const r = await exportText(model, blobs, null, { services });
    expect(r.emptyPages).toEqual([2]);
  });

  it('stops when cancelled', async () => {
    const { model, blobs, services } = await setup(2);
    const ctrl = new AbortController();
    ctrl.abort();
    await expect(
      exportText(model, blobs, null, { services, signal: ctrl.signal }),
    ).rejects.toBeTruthy();
  });

  it('writes inserted image pages from their source into the export', async () => {
    const { model, blobs, services } = await setup(2);
    const png = encodePng(4, 2, new Uint8Array(4 * 2 * 4).fill(200));
    const imagePdf = await imagesToPdf(
      [
        { bytes: png, kind: 'png', name: 'a.png' },
        { bytes: png, kind: 'png', name: 'b.png' },
      ],
      { pageSize: 'fit', orientation: 'auto', marginPt: 0 },
    );
    blobs.addSource('img', imagePdf);
    model.addSource(makeSource('img', 2, 'merged'));
    model.dispatch({
      type: 'page.insertImages',
      params: { at: 1, sourceId: 'img', newIds: ['i1', 'i2'] },
    });
    const bytes = await materializeView(model, blobs, null, { services });
    const out = await PDFDocument.load(bytes);
    expect(out.getPageCount()).toBe(4);
    expect(out.getPage(1).getSize()).toEqual({ width: 3, height: 1.5 });
    expect(await pdfPageTexts(bytes)).toEqual(['Alpha 1', '', '', 'Alpha 2']);
  });

  it('turns images into a PDF in the edit worker', async () => {
    const png = encodePng(2, 2, new Uint8Array(16).fill(255));
    const calls: unknown[][] = [];
    const edit = {
      call: async (method: string, args: unknown[]) => {
        calls.push([method, ...args]);
        return Uint8Array.of(1);
      },
    } as unknown as Services['edit'];
    const out = await imagesAsPdf(
      edit,
      [{ bytes: png, kind: 'png', name: 'x.png' }],
      'fit',
    );
    expect(out).toEqual(Uint8Array.of(1));
    expect(calls[0][0]).toBe('imagesToPdf');
    expect(calls[0][2]).toEqual({
      pageSize: 'fit',
      orientation: 'auto',
      marginPt: 0,
    });
  });
});
