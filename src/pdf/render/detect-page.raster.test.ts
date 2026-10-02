import { describe, expect, it } from 'vitest';
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { OpsTable, Seg } from '@/pdf/detect';
import {
  rulingSegments,
  segmentsToPage,
  toGray,
  type ImageOpsTable,
} from '@/pdf/detect/raster';
import type { Box } from '@/pdf/doc/types';
import { writeTextLayer } from '@/pdf/ocr/text-layer';
import {
  loadPageInputs,
  makeFlatFormWord,
  makeScanForm,
} from '../../../test/fixtures/flat-form';
import { ocrFonts, renderPageRgba } from '../../../test/fixtures/scan';
import {
  detectFromPage,
  RASTER_DPI,
  type DetectPageLike,
  type PageDetectionResult,
} from './detect-page';

/** What the render worker's raster pass does, with pdf.js in Node. */
const nodeRaster = (bytes: Uint8Array) => async (): Promise<Seg[]> => {
  const img = await renderPageRgba(bytes, 0, RASTER_DPI / 72);
  return segmentsToPage(
    rulingSegments(toGray(img.data, img.width, img.height), RASTER_DPI),
    { view: [0, 0, 612, 792], rotate: 0 },
    RASTER_DPI,
  );
};

async function detect(
  bytes: Uint8Array,
  raster: (() => Promise<Seg[]>) | null,
): Promise<PageDetectionResult> {
  const task = getDocument({
    data: bytes.slice(),
    useSystemFonts: false,
    verbosity: 0,
  });
  try {
    const page = await (await task.promise).getPage(1);
    return await detectFromPage(
      page as unknown as DetectPageLike,
      0,
      OPS as unknown as OpsTable,
      raster
        ? { ops: OPS as unknown as ImageOpsTable, segments: raster }
        : undefined,
    );
  } finally {
    await task.destroy();
  }
}

/**
 * The labels an OCR pass would find on the scan: the vector form's text
 * items, as image-pixel word boxes at 72 dpi (image y runs down).
 */
async function labelWords() {
  const { bytes } = await makeFlatFormWord();
  const [page] = await loadPageInputs(bytes);
  return page.text.items
    .filter((t) => t.str.trim())
    .map((t) => {
      const [, , , size, x, base] = t.transform;
      return {
        text: t.str,
        confidence: 95,
        bbox: {
          x0: x,
          x1: x + t.width,
          y0: 792 - (base + 0.75 * size),
          y1: 792 - (base - 0.21 * size),
        },
      };
    });
}

const iou = (a: Box, b: Box) => {
  const x = Math.max(
    0,
    Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x),
  );
  const y = Math.max(
    0,
    Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y),
  );
  const i = x * y;
  return i / (a.width * a.height + b.width * b.height - i);
};

describe('detectFromPage on a scanned form (raster rulings)', () => {
  it('finds no geometry on an image-only page without the raster pass', async () => {
    const d = await detect(await makeScanForm(), null);
    expect(d.cells).toEqual([]);
  });

  it('builds cells from the scan and leaves vector pages alone', async () => {
    const scan = await makeScanForm();
    const d = await detect(scan, nodeRaster(scan));
    expect(d.cells.length).toBeGreaterThanOrEqual(19);
    // A vector form never calls the raster pass.
    const { bytes } = await makeFlatFormWord();
    let called = false;
    await detect(bytes, async () => {
      called = true;
      return [];
    });
    expect(called).toBe(false);
  });

  it('detects the fields of the OCR-labelled scan with precision >= 0.8', async () => {
    // Scan quality is lower than vector: 0.8 here, against 0.9 for vector forms.
    const scan = await makeScanForm();
    const { bytes: labelled } = await writeTextLayer(
      scan,
      [
        {
          pageIndex: 0,
          words: await labelWords(),
          imageWidth: 612,
          imageHeight: 792,
          dpi: 72,
        },
      ],
      ocrFonts(),
    );
    const d = await detect(labelled, nodeRaster(labelled));
    const truth = (await makeFlatFormWord()).truth.filter((t) => t.page === 0);
    const found = d.fields.filter((f) => f.status === 'field');
    const used = new Set<number>();
    let tp = 0;
    for (const f of found) {
      const j = truth.findIndex(
        (t, k) => !used.has(k) && iou(t.rect, f.rect) >= 0.6,
      );
      if (j >= 0) {
        used.add(j);
        tp++;
      }
    }
    expect(found.length).toBeGreaterThan(0);
    expect(tp / found.length).toBeGreaterThanOrEqual(0.8);
    expect(tp / truth.length).toBeGreaterThanOrEqual(0.8);
    expect(found.some((f) => f.label === 'Surname')).toBe(true);
  });
});
