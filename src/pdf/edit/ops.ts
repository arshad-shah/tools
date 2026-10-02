import { PDFDocument } from 'pdf-lib';
import { ToolError } from '@/shared/lib/errors';
import { loadPdf } from './load';
import { arrangePages, type Rotation } from './pages';
import type { PageRange } from './ranges';
import { rangesToIndices } from './ranges';

export type { Rotation } from './pages';

export interface PageEdit {
  /** 0-based index into the source document. */
  source: number;
  /** Added to the page's existing rotation. */
  rotate: Rotation;
}

/**
 * pdf-lib throws raw internals ("Expected instance of PDFDict...") when a
 * file's structure is broken in ways it only notices while copying or
 * serializing. Users get a plain message; the original stays as the cause.
 */
async function rebuilding<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (cause) {
    if (cause instanceof ToolError) throw cause;
    throw new ToolError(
      'INVALID_FILE',
      'This PDF has a structure we could not rebuild. It may be damaged.',
      { cause },
    );
  }
}

const save = (doc: PDFDocument) =>
  rebuilding(() => doc.save({ useObjectStreams: true }));

/**
 * Saves a document edited in place (object streams on). Form fields keep
 * their own appearances: pdf-lib's are not regenerated. Rebuild failures
 * become INVALID_FILE.
 */
export const rebuildingSave = (doc: PDFDocument): Promise<Uint8Array> =>
  rebuilding(() =>
    doc.save({ useObjectStreams: true, updateFieldAppearances: false }),
  );

/** Called after each input (merge) or output (split) is done. */
export interface OpProgress {
  onProgress?: (done: number, total: number) => void;
}

const ROTATIONS: readonly number[] = [0, 90, 180, 270];

export function assertIndices(indices: number[], pageCount: number) {
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
  return rebuilding(async () => {
    const pages = await target.copyPages(source, indices);
    pages.forEach((p) => target.addPage(p));
    return pages;
  });
}

export async function merge(
  inputs: { bytes: Uint8Array; pages?: number[] }[],
  { onProgress }: OpProgress = {},
): Promise<Uint8Array> {
  if (inputs.length === 0)
    throw new ToolError('INVALID_INPUT', 'Add at least one PDF');
  const out = await PDFDocument.create();
  for (const [i, input] of inputs.entries()) {
    const src = await loadPdf(input.bytes);
    const indices = input.pages ?? src.getPageIndices();
    assertIndices(indices, src.getPageCount());
    await copyInto(out, src, indices);
    onProgress?.(i + 1, inputs.length);
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
  { onProgress }: OpProgress = {},
): Promise<Uint8Array[]> {
  if (ranges.length === 0)
    throw new ToolError('INVALID_INPUT', 'Enter at least one page or range');
  const src = await loadPdf(bytes);
  const pageCount = src.getPageCount();
  const results: Uint8Array[] = [];
  for (const [i, range] of ranges.entries()) {
    // Check the bounds before expanding: {0, 1e9} must not allocate.
    assertIndices([range.start, range.end], pageCount);
    if (range.start > range.end)
      throw new ToolError(
        'INVALID_INPUT',
        `Range ${range.start + 1}-${range.end + 1} runs backwards`,
      );
    const out = await PDFDocument.create();
    await copyInto(out, src, rangesToIndices([range]));
    results.push(await save(out));
    onProgress?.(i + 1, ranges.length);
  }
  return results;
}

export interface PageEditResult {
  bytes: Uint8Array;
  /**
   * Plain-language notes about document structure that could not be kept
   * (e.g. bookmarks that pointed at deleted pages). Empty when nothing was
   * lost. Tools must show these to the user.
   */
  notes: string[];
}

/**
 * Edits pages in place on the loaded source (see `arrangePages`): order,
 * deletions, repeats (copies) and rotation, keeping everything
 * document-level. What can't survive is removed and reported in `notes`.
 */
export async function applyPageEdits(
  bytes: Uint8Array,
  edits: PageEdit[],
): Promise<PageEditResult> {
  if (edits.length === 0)
    throw new ToolError(
      'INVALID_INPUT',
      'The document must keep at least one page',
    );
  if (edits.some((e) => !ROTATIONS.includes(e.rotate)))
    throw new ToolError('INVALID_INPUT', 'Rotation must be a multiple of 90°');
  const doc = await loadPdf(bytes);
  const original = doc.getPages();
  assertIndices(
    edits.map((e) => e.source),
    original.length,
  );
  const { notes } = await rebuilding(() =>
    arrangePages(
      doc,
      edits.map((e) => ({ page: original[e.source], rotate: e.rotate })),
    ),
  );
  return { bytes: await rebuildingSave(doc), notes };
}
