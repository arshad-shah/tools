import { deriveFilename } from '@/shared/lib/download';
import type { JobProgress } from '@/shared/state/useJob';
import type { BlobSource } from '@/pdf/doc/blob-store';
import type { DocumentModel } from '@/pdf/doc/model';
import { planFor } from '@/pdf/doc/plan';
import { materializeIn, type Services } from '@/pdf/doc/services';
import type { PageId } from '@/pdf/doc/types';
import type { ImageInput, PageSizeName } from '@/pdf/edit/images';
import {
  textFromItems,
  type DocInfo,
  type ImageFormat,
  type PageTextItems,
} from '@/pdf/render';
import { toMarkdown, type CellBox } from './markdown';

/**
 * Convert mode exports (spec 7.2): each action materialises the current
 * view once (every pending change included), opens the result in the render
 * worker, reads what it needs and closes it. Nothing here changes the
 * document.
 */
export interface ConvertEnv {
  services: Pick<Services, 'edit' | 'render'>;
  signal?: AbortSignal;
  progress?: (p: JobProgress) => void;
}

export const IMAGE_MIME: Record<ImageFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
};

/** View page numbers (1-based) of `pageIds`, in document order; all when null. */
function pageNumbers(model: DocumentModel, pageIds: PageId[] | null) {
  const only = pageIds ? new Set(pageIds) : null;
  return model
    .getView()
    .pages.flatMap((p, i) => (!only || only.has(p.id) ? [i + 1] : []));
}

/** The current view (or just `pageIds`) as PDF bytes. */
export async function materializeView(
  model: DocumentModel,
  blobs: BlobSource,
  pageIds: PageId[] | null,
  env: ConvertEnv,
): Promise<Uint8Array> {
  env.signal?.throwIfAborted();
  const plan = await planFor(
    model,
    blobs,
    pageIds ? { onlyPages: pageIds } : {},
  );
  const out = await materializeIn(env.services, plan, {
    signal: env.signal,
    progress: env.progress,
  });
  return out.bytes;
}

/** Materialises, opens the result in the render worker, runs `fn`, closes it. */
async function withMaterialized<R>(
  model: DocumentModel,
  blobs: BlobSource,
  pageIds: PageId[] | null,
  env: ConvertEnv,
  fn: (info: DocInfo, numbers: number[]) => Promise<R>,
): Promise<R> {
  const numbers = pageNumbers(model, pageIds);
  const bytes = await materializeView(model, blobs, pageIds, env);
  const { render } = env.services;
  const info = await render.open(bytes, env.signal);
  try {
    return await fn(info, numbers);
  } finally {
    void render.close(info.docId).catch(() => {});
  }
}

async function eachPageText(
  info: DocInfo,
  numbers: number[],
  env: ConvertEnv,
): Promise<PageTextItems[]> {
  const out: PageTextItems[] = [];
  for (let i = 0; i < info.pageCount; i++) {
    env.signal?.throwIfAborted();
    env.progress?.({ done: i, total: numbers.length, label: 'Reading text' });
    out.push(await env.services.render.textItems(info.docId, i, env.signal));
  }
  return out;
}

/**
 * Each page's table cells from the flat-form cell detector, for GFM tables.
 * A page the detector can't read just has none (its text stays prose).
 */
async function eachPageCells(
  info: DocInfo,
  env: ConvertEnv,
): Promise<CellBox[][]> {
  const out: CellBox[][] = [];
  for (let i = 0; i < info.pageCount; i++) {
    env.signal?.throwIfAborted();
    try {
      const d = await env.services.render.detect(info.docId, i, env.signal);
      out.push(d.cells);
    } catch (e) {
      if (env.signal?.aborted) throw e;
      out.push([]);
    }
  }
  return out;
}

const emptyOf = (pages: PageTextItems[], numbers: number[]) =>
  pages.flatMap((p, i) =>
    p.items.some((it) => it.str.trim() !== '') ? [] : [numbers[i]],
  );

/** Plain text, one section per page (the PDF to Text tool's layout). */
export function exportText(
  model: DocumentModel,
  blobs: BlobSource,
  pageIds: PageId[] | null,
  env: ConvertEnv,
): Promise<{ text: string; emptyPages: number[] }> {
  return withMaterialized(model, blobs, pageIds, env, async (info, nums) => {
    const pages = await eachPageText(info, nums, env);
    const text = pages
      .map((p, i) => `--- Page ${nums[i]} ---\n${textFromItems(p.items).text}`)
      .join('\n\n');
    return { text: `${text}\n`, emptyPages: emptyOf(pages, nums) };
  });
}

/** Best-effort structural Markdown (see toMarkdown). */
export function exportMarkdown(
  model: DocumentModel,
  blobs: BlobSource,
  pageIds: PageId[] | null,
  env: ConvertEnv,
): Promise<{ markdown: string; emptyPages: number[] }> {
  return withMaterialized(model, blobs, pageIds, env, async (info, nums) => {
    const pages = await eachPageText(info, nums, env);
    const cells = await eachPageCells(info, env);
    return {
      markdown: toMarkdown(
        pages.map((items, i) => ({ items, geometry: { cells: cells[i] } })),
      ),
      emptyPages: emptyOf(pages, nums),
    };
  });
}

export interface ImageExportOptions {
  format: ImageFormat;
  dpi: number;
  /** JPEG quality 0 to 1. */
  quality: number;
}

export type ImageSink = (file: { name: string; data: Uint8Array }) => void;

/**
 * One image per page; `capped` lists pages rendered below the asked DPI.
 * With a `sink`, each image goes to it as soon as it is rendered and none
 * is kept (`files` stays empty), so a long export never holds them all.
 */
export function exportImages(
  model: DocumentModel,
  blobs: BlobSource,
  pageIds: PageId[] | null,
  o: ImageExportOptions,
  env: ConvertEnv,
  sink?: ImageSink,
): Promise<{
  files: { name: string; data: Uint8Array }[];
  capped: { page: number; dpi: number }[];
}> {
  const name = model.getState().name;
  return withMaterialized(model, blobs, pageIds, env, async (info, nums) => {
    const digits = String(model.getView().pages.length).length;
    const ext = o.format === 'png' ? 'png' : 'jpg';
    const files: { name: string; data: Uint8Array }[] = [];
    const capped: { page: number; dpi: number }[] = [];
    // One page at a time: one full-size canvas in the worker at once.
    for (let i = 0; i < info.pageCount; i++) {
      env.signal?.throwIfAborted();
      env.progress?.({ done: i, total: nums.length, label: 'Rendering pages' });
      const img = await env.services.render.renderPageImage(
        info.docId,
        i,
        o,
        env.signal,
        2, // background: never ahead of the canvas
      );
      const n = String(nums[i]).padStart(digits, '0');
      const file = {
        name: deriveFilename(name, `page-${n}`, ext),
        data: img.bytes,
      };
      if (sink) sink(file);
      else files.push(file);
      if (img.capped) capped.push({ page: nums[i], dpi: img.dpi });
    }
    return { files, capped };
  });
}

/** Images (PNG or JPEG) as one PDF, a page per image, built in the edit worker. */
export function imagesAsPdf(
  edit: Services['edit'],
  images: ImageInput[],
  pageSize: PageSizeName,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  return edit.call(
    'imagesToPdf',
    [images, { pageSize, orientation: 'auto', marginPt: 0 }],
    { signal },
  );
}
