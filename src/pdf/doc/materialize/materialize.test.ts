import { beforeAll, describe, expect, it, vi } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { makeTextPdf, pdfPageTexts } from '../../../../test/fixtures/builders';
import type { PageRef } from '../types';
import { materialize, type MaterializePlan } from './materialize';

const ctx = () => ({
  signal: new AbortController().signal,
  progress: () => {},
});
const ref = (
  id: string,
  source: string,
  index: number,
  rotate = 0,
): PageRef => ({
  id,
  source,
  index,
  rotate: rotate as PageRef['rotate'],
});

let base: Uint8Array;
let merged: Uint8Array;
beforeAll(async () => {
  base = await makeTextPdf({ pages: 3, label: 'Alpha' });
  merged = await makeTextPdf({ pages: 2, label: 'Merged' });
});
const plan = (patch: Partial<MaterializePlan> = {}): MaterializePlan => ({
  base,
  baseSourceId: 's0',
  sources: { s2: merged },
  assets: {},
  pages: [ref('c:2', 's0', 2), ref('c:0', 's0', 0, 90), ref('m1', 's2', 1)],
  pageLabels: null,
  overlays: [],
  ...patch,
});

describe('materialize', () => {
  it('writes the page map: order, rotation and merged pages', async () => {
    const out = await materialize(plan(), ctx());
    expect(await pdfPageTexts(out.bytes)).toEqual([
      'Alpha 3',
      'Alpha 1',
      'Merged 2',
    ]);
    const doc = await PDFDocument.load(out.bytes);
    expect(doc.getPages().map((p) => p.getRotation().angle)).toEqual([
      0, 90, 0,
    ]);
  });

  it('exports only the planned pages', async () => {
    const out = await materialize(
      plan({ pages: [ref('c:1', 's0', 1)] }),
      ctx(),
    );
    expect(await pdfPageTexts(out.bytes)).toEqual(['Alpha 2']);
  });

  it('duplicates and blank pages', async () => {
    const out = await materialize(
      plan({
        pages: [
          ref('c:0', 's0', 0),
          ref('d', 's0', 0, 180),
          { ...ref('b', '', 0), blank: { width: 300, height: 400 } },
        ],
      }),
      ctx(),
    );
    expect(await pdfPageTexts(out.bytes)).toEqual(['Alpha 1', 'Alpha 1', '']);
    const doc = await PDFDocument.load(out.bytes);
    expect(doc.getPages()[2].getSize()).toEqual({ width: 300, height: 400 });
  });

  it('copies pages with one copyPages call per source document', async () => {
    const copy = vi.spyOn(PDFDocument.prototype, 'copyPages');
    try {
      const out = await materialize(
        plan({
          sources: { s2: merged, s3: base },
          pages: [
            ref('m1', 's2', 1),
            ref('c:0', 's0', 0),
            ref('x2', 's3', 2),
            ref('m0', 's2', 0),
            ref('d0', 's0', 0),
            ref('m1b', 's2', 1),
            ref('d1', 's0', 0),
          ],
        }),
        ctx(),
      );
      expect(copy).toHaveBeenCalledTimes(3);
      expect(await pdfPageTexts(out.bytes)).toEqual([
        'Merged 2',
        'Alpha 1',
        'Alpha 3',
        'Merged 1',
        'Alpha 1',
        'Merged 2',
        'Alpha 1',
      ]);
    } finally {
      copy.mockRestore();
    }
  });

  it('writes page labels', async () => {
    const out = await materialize(
      plan({
        pageLabels: [
          { start: 0, style: 'r' },
          { start: 2, style: 'D', first: 1 },
        ],
      }),
      ctx(),
    );
    const task = getDocument({ data: out.bytes.slice(), verbosity: 0 });
    try {
      const pdf = await task.promise;
      expect(await pdf.getPageLabels()).toEqual(['i', 'ii', '1']);
    } finally {
      await task.destroy();
    }
  });

  it('refuses an overlay without a writer', async () => {
    await expect(
      materialize(
        plan({
          overlays: [{ opId: 'o', type: 'x', pageId: null, params: {} }],
        }),
        ctx(),
      ),
    ).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      message: 'No writer for edit type x',
    });
  });

  it('refuses a missing merged source and honours cancellation', async () => {
    await expect(
      materialize(plan({ sources: {} }), ctx()),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    const ctrl = new AbortController();
    ctrl.abort();
    await expect(
      materialize(plan(), { signal: ctrl.signal, progress: () => {} }),
    ).rejects.toMatchObject({ code: 'CANCELLED' });
  });
});
