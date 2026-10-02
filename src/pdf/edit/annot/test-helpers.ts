// Test-only helpers (imported by *.test.ts files only).
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { PDFDocument, type PDFPage } from 'pdf-lib';
import { AnnotationMode, getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { DrawCtx } from '../draw';
import { FontCache } from '../font-cache';
import type { Box } from '../draw';
import type { AnnotBase } from './common';

const notoPath = createRequire(import.meta.url).resolve(
  '@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff',
);
export const loadNoto = () =>
  Promise.resolve(new Uint8Array(readFileSync(notoPath)));

export async function blankDoc(
  size: [number, number] = [612, 792],
): Promise<{ doc: PDFDocument; page: PDFPage; draw: DrawCtx }> {
  const doc = await PDFDocument.create();
  const page = doc.addPage(size);
  return { doc, page, draw: { doc, fonts: new FontCache(doc, loadNoto) } };
}

let n = 0;
export function base(patch: Partial<AnnotBase> = {}): AnnotBase {
  const at = new Date(2026, 0, 2, 3, 4, 5);
  return {
    nm: `nm-${n++}`,
    author: 'Me',
    color: '#ffd400',
    opacity: 1,
    contents: '',
    created: at,
    modified: at,
    ...patch,
  };
}

// pdf.js annotation data is loosely typed; tests read the fields they need.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnnotData = Record<string, any>;

export async function readAnnotations(
  bytes: Uint8Array,
  pageIndex = 0,
): Promise<AnnotData[]> {
  const task = getDocument({ data: bytes.slice(), verbosity: 0 });
  try {
    const pdf = await task.promise;
    const page = await pdf.getPage(pageIndex + 1);
    return (await page.getAnnotations({ intent: 'display' })) as AnnotData[];
  } finally {
    await task.destroy();
  }
}

export interface Rendered {
  width: number;
  height: number;
  data: Uint8ClampedArray;
  /** Mean RGB inside a page-space box (scale 1, unrotated page with origin 0 0). */
  mean(box: Box): [number, number, number];
  /** Count of pixels inside the box that are not near white. */
  inked(box: Box): number;
}

/** Renders a page at scale 1 with annotation appearances drawn. */
export async function renderPage(
  bytes: Uint8Array,
  pageIndex = 0,
): Promise<Rendered> {
  const task = getDocument({ data: bytes.slice(), verbosity: 0 });
  try {
    const pdf = await task.promise;
    const page = await pdf.getPage(pageIndex + 1);
    const vp = page.getViewport({ scale: 1 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const factory = (pdf as any).canvasFactory;
    const { canvas, context } = factory.create(vp.width, vp.height);
    await page.render({
      canvas,
      canvasContext: context,
      viewport: vp,
      annotationMode: AnnotationMode.ENABLE_FORMS,
    }).promise;
    const width = Math.round(vp.width);
    const height = Math.round(vp.height);
    const data: Uint8ClampedArray = context.getImageData(
      0,
      0,
      width,
      height,
    ).data;
    const each = (box: Box, fn: (i: number) => void) => {
      const x0 = Math.max(0, Math.ceil(box.x));
      const x1 = Math.min(width, Math.floor(box.x + box.width));
      const top = Math.max(0, Math.ceil(height - (box.y + box.height)));
      const bottom = Math.min(height, Math.floor(height - box.y));
      for (let y = top; y < bottom; y++)
        for (let x = x0; x < x1; x++) fn((y * width + x) * 4);
    };
    return {
      width,
      height,
      data,
      mean(box) {
        const sum = [0, 0, 0];
        let count = 0;
        each(box, (i) => {
          sum[0] += data[i];
          sum[1] += data[i + 1];
          sum[2] += data[i + 2];
          count++;
        });
        return sum.map((s) => s / Math.max(1, count)) as [
          number,
          number,
          number,
        ];
      },
      inked(box) {
        let count = 0;
        each(box, (i) => {
          if (data[i] < 235 || data[i + 1] < 235 || data[i + 2] < 235) count++;
        });
        return count;
      },
    };
  } finally {
    await task.destroy();
  }
}
