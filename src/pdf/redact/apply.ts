import type { PDFDocument } from 'pdf-lib';
import type { ImageCodec } from '@/pdf/compress/codec';
import type { Box } from '@/pdf/doc/types';
import type { RasterReason } from '@/pdf/edit/content/font-metrics';
import { loadPdf } from '@/pdf/edit/load';
import { removeAnnotations } from './annots';
import type { RedactPageCtx } from './content';
import { drawFills, rgbOf, type RedactMark } from './fill';
import { redactPageContent } from './page';
import { scrubDocument } from './scrub';
import type { glyphEdits } from './text';

export type { RedactMark } from './fill';

export interface PageMarks {
  pageIndex: number;
  marks: RedactMark[];
}

export interface PageRedactReport {
  pageIndex: number;
  marks: number;
  glyphs: number;
  images: number;
  paths: number;
  annotations: number;
}

export interface RedactPagesResult {
  bytes: Uint8Array;
  rasterNeeded: { pageIndex: number; reasons: RasterReason[] }[];
  removed: {
    glyphs: number;
    images: number;
    paths: number;
    annotations: number;
  };
  pages: PageRedactReport[];
  scrubbed: string[];
  tagged: boolean;
}

export interface RedactOptions {
  codec: ImageCodec;
  /** Test seam: a deliberately broken glyph remover. */
  glyphEdits?: typeof glyphEdits;
}

export const boxesOf = (p: PageMarks): Box[] => p.marks.map((m) => m.box);

async function redactOnePage(
  doc: PDFDocument,
  p: PageMarks,
  o: RedactOptions,
  fonts: RedactPageCtx['fonts'],
): Promise<{ report: PageRedactReport; raster: RasterReason[] }> {
  const page = doc.getPage(p.pageIndex);
  const boxes = boxesOf(p);
  const ctx: RedactPageCtx = {
    doc,
    codec: o.codec,
    fonts,
    fill: rgbOf(p.marks[0]?.fill ?? '#000000'),
    depth: 0,
    counts: { glyphs: 0, images: 0, paths: 0 },
    glyphEdits: o.glyphEdits,
  };
  const r = await redactPageContent(doc, page, boxes, ctx);
  const annotations = removeAnnotations(doc, page, boxes);
  if (!r.raster.length) await drawFills(doc, page, p.marks);
  return {
    raster: r.raster,
    report: {
      pageIndex: p.pageIndex,
      marks: p.marks.length,
      ...(r.raster.length ? { glyphs: 0, images: 0, paths: 0 } : ctx.counts),
      annotations,
    },
  };
}

/**
 * Applies redactions page by page (spec 10.2 steps 1 to 8). Pages that
 * cannot be edited safely are left untouched and listed in `rasterNeeded`:
 * the caller turns them into images.
 */
export async function redactPages(
  bytes: Uint8Array,
  pages: readonly PageMarks[],
  terms: readonly string[],
  o: RedactOptions,
): Promise<RedactPagesResult> {
  const doc = await loadPdf(bytes);
  const fonts: RedactPageCtx['fonts'] = new WeakMap();
  const out: RedactPagesResult = {
    bytes,
    rasterNeeded: [],
    removed: { glyphs: 0, images: 0, paths: 0, annotations: 0 },
    pages: [],
    scrubbed: [],
    tagged: false,
  };
  for (const p of pages) {
    if (!p.marks.length) continue;
    const { report, raster } = await redactOnePage(doc, p, o, fonts);
    out.pages.push(report);
    if (raster.length)
      out.rasterNeeded.push({ pageIndex: p.pageIndex, reasons: raster });
    out.removed.glyphs += report.glyphs;
    out.removed.images += report.images;
    out.removed.paths += report.paths;
    out.removed.annotations += report.annotations;
  }
  const scrub = scrubDocument(doc, terms);
  out.scrubbed = scrub.scrubbed;
  out.tagged = scrub.tagged;
  out.bytes = await doc.save({ useObjectStreams: true });
  return out;
}
