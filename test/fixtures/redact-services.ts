// Test-only: workspace services for redaction built on real engines in Node
// (pdf.js legacy + @napi-rs/canvas, qpdf-wasm, the edit handlers in process).
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { optimize, run } from '@arshad-shah/qpdf-wasm';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { RedactMarkParams } from '@/pdf/doc/ops/redact';
import type { Services } from '@/pdf/doc/services';
import type { Box, DocView, OverlayItem } from '@/pdf/doc/types';
import { redactPages, type RedactOptions } from '@/pdf/redact/apply';
import type { RedactMark } from '@/pdf/redact/fill';
import {
  burnMarks,
  collectDocTexts,
  coverageOf,
} from '@/pdf/redact/raster-core';
import { replaceWithImage } from '@/pdf/redact/rasterise';
import { textItemsFrom } from '@/pdf/render/text';
import { nodeJpegCodec } from './jpeg-codec';

const pdfjsRequire = createRequire(
  createRequire(import.meta.url).resolve('pdfjs-dist/package.json'),
);
const { createCanvas } = pdfjsRequire('@napi-rs/canvas') as {
  createCanvas(
    w: number,
    h: number,
  ): {
    getContext(kind: '2d'): CanvasRenderingContext2D;
    toBuffer(mime: 'image/png'): Uint8Array;
    width: number;
  };
};
const standardFontDataUrl = pathToFileURL(
  `${createRequire(import.meta.url)
    .resolve('pdfjs-dist/package.json')
    .replace(/package\.json$/, '')}standard_fonts/`,
).href;

type PdfDoc = Awaited<ReturnType<typeof getDocument>['promise']>;

export function nodeRedactServices(
  opts: { glyphEdits?: RedactOptions['glyphEdits'] } = {},
): Services {
  const docs = new Map<string, { doc: PdfDoc; destroy(): Promise<void> }>();
  let next = 0;
  const pdf = (id: string) => docs.get(id)!.doc;

  async function renderFlat(docId: string, pageIndex: number, dpi: number) {
    const page = await pdf(docId).getPage(pageIndex + 1);
    const viewport = page.getViewport({ scale: dpi / 72, rotation: 0 });
    const canvas = createCanvas(
      Math.ceil(viewport.width),
      Math.ceil(viewport.height),
    );
    const g = canvas.getContext('2d');
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, canvas.width, Math.ceil(viewport.height));
    await page.render({
      canvas: canvas as unknown as HTMLCanvasElement,
      canvasContext: g,
      viewport,
    }).promise;
    page.cleanup();
    return { canvas, g, viewport };
  }

  const render = {
    async open(bytes: Uint8Array) {
      const task = getDocument({
        data: bytes.slice(),
        verbosity: 0,
        useSystemFonts: false,
        standardFontDataUrl,
      });
      const doc = await task.promise;
      const docId = `d${next++}`;
      docs.set(docId, { doc, destroy: () => task.destroy() });
      return { docId, pageCount: doc.numPages, pages: [] };
    },
    async close(docId: string) {
      await docs.get(docId)?.destroy();
      docs.delete(docId);
    },
    async textItems(docId: string, pageIndex: number) {
      const page = await pdf(docId).getPage(pageIndex + 1);
      return textItemsFrom(
        await page.getTextContent({ includeMarkedContent: false }),
      );
    },
    async markCoverage(
      docId: string,
      pageIndex: number,
      dpi: number,
      marks: RedactMark[],
    ) {
      const { canvas, g, viewport } = await renderFlat(docId, pageIndex, dpi);
      const h = Math.ceil(viewport.height);
      const { data } = g.getImageData(0, 0, canvas.width, h);
      return coverageOf(data, canvas.width, viewport, marks);
    },
    async renderBurned(
      docId: string,
      pageIndex: number,
      dpi: number,
      marks: RedactMark[],
    ) {
      const { canvas, g, viewport } = await renderFlat(docId, pageIndex, dpi);
      burnMarks(g, viewport, marks);
      return {
        bytes: new Uint8Array(canvas.toBuffer('image/png')),
        mime: 'image/png' as const,
      };
    },
    async docTexts(docId: string) {
      return { entries: await collectDocTexts(pdf(docId)) };
    },
  };

  const qpdf = {
    async optimize(bytes: Uint8Array, o: Parameters<typeof optimize>[1]) {
      const r = await optimize(bytes, o);
      return { bytes: r.bytes, warnings: r.warnings };
    },
    async qdf(bytes: Uint8Array) {
      const r = await run(
        ['--qdf', '--object-streams=disable', 'in.pdf', 'out.pdf'],
        {
          'in.pdf': bytes,
        },
      );
      return { bytes: r.files['out.pdf'], warnings: [] };
    },
  };

  const edit = {
    async call(method: string, args: unknown[]) {
      if (method === 'redactPages') {
        const [bytes, pages, terms] = args as Parameters<typeof redactPages>;
        return redactPages(bytes, pages, terms, {
          codec: nodeJpegCodec,
          glyphEdits: opts.glyphEdits,
        });
      }
      if (method === 'replaceWithImage')
        return replaceWithImage(
          ...(args as Parameters<typeof replaceWithImage>),
        );
      throw new Error(`fake edit worker has no ${method}`);
    },
    terminate() {},
    generation: 0,
    onRestart: () => () => {},
  };

  return {
    edit: edit as unknown as Services['edit'],
    render: render as unknown as Services['render'],
    qpdf: qpdf as unknown as Services['qpdf'],
    compress: {} as Services['compress'],
    ocr: {} as Services['ocr'],
  };
}

/** A view whose pages carry redaction marks (a search term makes it a search mark). */
export function viewWithMarks(
  pageCount: number,
  marks: { page: number; rects: Box[]; term?: string }[],
): DocView {
  const pages = Array.from({ length: pageCount }, (_, i) => ({
    id: `p${i}`,
    source: 's0',
    index: i,
    rotate: 0 as const,
  }));
  const overlays = new Map<string, OverlayItem[]>();
  marks.forEach((m, k) => {
    const params: RedactMarkParams = {
      id: `m${k}`,
      pageId: `p${m.page}`,
      rects: m.rects,
      source: m.term
        ? {
            kind: 'search',
            query: {
              text: m.term,
              regex: false,
              caseSensitive: false,
              wholeWord: false,
            },
            matched: m.term,
          }
        : { kind: 'area' },
      fill: '#000000',
      overlayText: null,
    };
    const list = overlays.get(`p${m.page}`) ?? [];
    list.push({
      opId: `o${k}`,
      type: 'redact.mark',
      pageId: `p${m.page}`,
      params,
    });
    overlays.set(`p${m.page}`, list);
  });
  return {
    checkpoint: 'c0',
    pages,
    overlays,
    docOverlays: [],
    pageLabels: null,
    hidden: new Set(),
  };
}

export const env = (services: Services) => ({
  services,
  signal: new AbortController().signal,
  progress: () => {},
});
