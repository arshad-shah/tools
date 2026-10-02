import { describe, expect, it } from 'vitest';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { makeRotatedPdf } from '../../../test/fixtures/builders';
import { readPageSizes } from './page-sizes';

const fakeDoc = (numPages: number, onPage?: (i: number) => void) => ({
  numPages,
  async getPage(i: number) {
    onPage?.(i);
    return {
      getViewport: () => ({ width: 100 + i, height: 200 }),
      view: [0, 0, 100 + i, 200],
      rotate: 0,
    };
  },
});

describe('readPageSizes', () => {
  it('reads every page size at scale 1', async () => {
    const sizes = await readPageSizes(fakeDoc(3), new AbortController().signal);
    expect(sizes).toEqual([
      { width: 101, height: 200, view: [0, 0, 101, 200], rotate: 0 },
      { width: 102, height: 200, view: [0, 0, 102, 200], rotate: 0 },
      { width: 103, height: 200, view: [0, 0, 103, 200], rotate: 0 },
    ]);
  });

  it('reports pdf.js view and rotate for rotated and cropped pages', async () => {
    const task = getDocument({
      data: await makeRotatedPdf(),
      useSystemFonts: false,
      verbosity: 0,
    });
    try {
      const doc = await task.promise;
      const sizes = await readPageSizes(doc, new AbortController().signal);
      expect(sizes[0]).toEqual({
        width: 612,
        height: 792,
        view: [0, 0, 612, 792],
        rotate: 0,
      });
      expect(sizes[1]).toMatchObject({ width: 792, height: 612, rotate: 90 });
      expect(sizes[2]).toMatchObject({ view: [20, 30, 575, 812], rotate: 270 });
    } finally {
      await task.destroy();
    }
  });

  it('stops early when the signal aborts mid-loop', async () => {
    const ctrl = new AbortController();
    let read = 0;
    const doc = fakeDoc(5000, () => {
      read++;
      if (read === 10) ctrl.abort();
    });
    await expect(readPageSizes(doc, ctrl.signal)).rejects.toMatchObject({
      code: 'CANCELLED',
    });
    expect(read).toBeLessThan(200);
  });
});
