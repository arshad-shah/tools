import { degrees, PDFDocument } from 'pdf-lib';
import { ToolError } from '@/shared/lib/errors';
import { loadPdf } from './load';
import type { PageRange } from './ranges';
import { rangesToIndices } from './ranges';

export type Rotation = 0 | 90 | 180 | 270;

export interface PageEdit {
  /** 0-based index into the source document. */
  source: number;
  /** Added to the page's existing rotation. */
  rotate: Rotation;
}

const save = (doc: PDFDocument) => doc.save({ useObjectStreams: true });

function assertIndices(indices: number[], pageCount: number) {
  if (indices.length === 0)
    throw new ToolError('INVALID_INPUT', 'Select at least one page');
  const bad = indices.find(
    (i) => !Number.isInteger(i) || i < 0 || i >= pageCount,
  );
  if (bad !== undefined)
    throw new ToolError(
      'INVALID_INPUT',
      `Page ${bad + 1} is out of range (1–${pageCount})`,
    );
}

async function copyInto(
  target: PDFDocument,
  source: PDFDocument,
  indices: number[],
) {
  const pages = await target.copyPages(source, indices);
  pages.forEach((p) => target.addPage(p));
  return pages;
}

export async function merge(
  inputs: { bytes: Uint8Array; pages?: number[] }[],
): Promise<Uint8Array> {
  if (inputs.length === 0)
    throw new ToolError('INVALID_INPUT', 'Add at least one PDF');
  const out = await PDFDocument.create();
  for (const input of inputs) {
    const src = await loadPdf(input.bytes);
    const indices = input.pages ?? src.getPageIndices();
    assertIndices(indices, src.getPageCount());
    await copyInto(out, src, indices);
  }
  return save(out);
}

export async function extract(
  bytes: Uint8Array,
  indices: number[],
): Promise<Uint8Array> {
  const src = await loadPdf(bytes);
  assertIndices(indices, src.getPageCount());
  const out = await PDFDocument.create();
  await copyInto(out, src, indices);
  return save(out);
}

export async function split(
  bytes: Uint8Array,
  ranges: PageRange[],
): Promise<Uint8Array[]> {
  if (ranges.length === 0)
    throw new ToolError('INVALID_INPUT', 'Enter at least one page or range');
  const src = await loadPdf(bytes);
  const results: Uint8Array[] = [];
  for (const range of ranges) {
    const indices = rangesToIndices([range]);
    assertIndices(indices, src.getPageCount());
    const out = await PDFDocument.create();
    await copyInto(out, src, indices);
    results.push(await save(out));
  }
  return results;
}

export async function applyPageEdits(
  bytes: Uint8Array,
  edits: PageEdit[],
): Promise<Uint8Array> {
  if (edits.length === 0)
    throw new ToolError(
      'INVALID_INPUT',
      'The document must keep at least one page',
    );
  const src = await loadPdf(bytes);
  assertIndices(
    edits.map((e) => e.source),
    src.getPageCount(),
  );
  const out = await PDFDocument.create();
  const pages = await copyInto(
    out,
    src,
    edits.map((e) => e.source),
  );
  pages.forEach((page, i) => {
    const angle =
      (((page.getRotation().angle + edits[i].rotate) % 360) + 360) % 360;
    page.setRotation(degrees(angle));
  });
  return save(out);
}
