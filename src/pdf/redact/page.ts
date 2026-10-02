import {
  decodePDFRawStream,
  PDFArray,
  PDFName,
  PDFRawStream,
  type PDFDocument,
  type PDFPage,
} from 'pdf-lib';
import type { Box } from '@/pdf/doc/types';
import type { RasterReason } from '@/pdf/edit/content/font-metrics';
import { IDENTITY } from '@/pdf/edit/content/matrix';
import { parseContent } from '@/pdf/edit/content/lexer';
import { serializeContent } from '@/pdf/edit/content/serialize';
import type { ParsedContent } from '@/pdf/edit/content/tokens';
import { redactStream, type RedactPageCtx } from './content';

/** A page's /Contents decoded and joined (streams separated by a newline). */
export function pageContentBytes(
  doc: PDFDocument,
  page: PDFPage,
): Uint8Array | null {
  const c = page.node.get(PDFName.of('Contents'));
  if (!c) return new Uint8Array(0);
  const v = doc.context.lookup(c);
  const list =
    v instanceof PDFArray ? v.asArray().map((r) => doc.context.lookup(r)) : [v];
  const parts: Uint8Array[] = [];
  try {
    for (const s of list) {
      if (!(s instanceof PDFRawStream)) return null;
      parts.push(decodePDFRawStream(s).decode(), Uint8Array.of(0x0a));
    }
  } catch {
    return null;
  }
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

export function setPageContent(
  doc: PDFDocument,
  page: PDFPage,
  parsed: ParsedContent,
) {
  page.node.set(
    PDFName.of('Contents'),
    doc.context.register(doc.context.flateStream(serializeContent(parsed))),
  );
}

/**
 * Redacts one page's content in place (text, paths, images, forms). On any
 * raster reason the page is left exactly as it was and the reasons returned.
 */
export async function redactPageContent(
  doc: PDFDocument,
  page: PDFPage,
  marks: readonly Box[],
  ctx: RedactPageCtx,
): Promise<{ raster: RasterReason[]; changed: boolean }> {
  const bytes = pageContentBytes(doc, page);
  if (!bytes) return { raster: ['parse-error'], changed: false };
  let parsed: ParsedContent;
  try {
    parsed = parseContent(bytes);
  } catch {
    return { raster: ['parse-error'], changed: false };
  }
  const resources = page.node.Resources();
  const r = await redactStream(parsed, resources, IDENTITY, marks, ctx);
  if (r.raster.length) return { raster: r.raster, changed: false };
  if (!r.changed) return { raster: [], changed: false };
  setPageContent(doc, page, r.parsed);
  if (r.resources) page.node.set(PDFName.of('Resources'), r.resources);
  return { raster: [], changed: true };
}
