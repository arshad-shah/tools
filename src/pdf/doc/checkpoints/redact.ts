import { ToolError } from '@/shared/lib/errors';
import type { RasterReason } from '@/pdf/edit/content/font-metrics';
import {
  withoutOverlayText,
  type PageMarks,
  type RedactMark,
  type RedactPagesResult,
} from '@/pdf/redact/apply';
import { verifyRedaction, type VerifyResult } from '@/pdf/redact/verify';
import type { RedactApplyParams, RedactMarkParams } from '../ops/redact';
import { plural } from '../ops/validate';
import type { Services } from '../services';
import type { CheckpointReport, DocView } from '../types';
import { defineCheckpointRunner, type CheckpointEnv } from './registry';

/** Why a page became an image, in plain words. */
export const RASTER_WORDS: Record<RasterReason | 'verification', string> = {
  'type3-no-metrics': 'it uses a Type 3 font without usable size information',
  'font-no-widths': 'it uses a font without size information',
  'unsupported-cmap': 'it uses a font encoding that cannot be edited safely',
  'clip-text': 'it uses text as a clipping shape',
  'pattern-text': 'it has text painted with a pattern',
  'pattern-content':
    'it has content drawn inside a pattern or a soft mask under a mark',
  'image-filter': 'it has an image in a format that cannot be edited',
  'image-colorspace':
    'it has an image in a colour format that cannot be edited',
  'parse-error': 'its content could not be read safely',
  verification: 'the first check found content left under a mark',
};

/** Marks per materialised page (view order) and the matched search terms. */
export function marksFromView(view: DocView): {
  pages: PageMarks[];
  terms: string[];
} {
  const pages: PageMarks[] = [];
  const terms = new Set<string>();
  view.pages.forEach((page, pageIndex) => {
    const marks: RedactMark[] = [];
    for (const item of view.overlays.get(page.id) ?? []) {
      if (item.type !== 'redact.mark' || view.hidden.has(item.opId)) continue;
      const p = item.params as RedactMarkParams;
      const term = p.source.kind === 'search' ? p.source.matched : undefined;
      if (term) terms.add(term);
      for (const box of p.rects)
        marks.push({
          box,
          fill: p.fill,
          overlayText: p.overlayText,
          ...(term ? { term } : {}),
        });
    }
    if (marks.length) pages.push({ pageIndex, marks });
  });
  return { pages, terms: [...terms] };
}

/** Test seam: the steps the runner takes, so a test can break one on purpose. */
export interface RedactSteps {
  verify: typeof verifyRedaction;
  rasterise: typeof rasterisePage;
}

export async function rasterisePage(
  services: Services,
  original: { docId: string },
  bytes: Uint8Array,
  page: PageMarks,
  dpi: number,
  signal: AbortSignal,
): Promise<Uint8Array> {
  const img = await services.render.renderBurned(
    original.docId,
    page.pageIndex,
    dpi,
    page.marks,
    signal,
  );
  return services.edit.call(
    'replaceWithImage',
    [bytes.slice(), page.pageIndex, img.bytes, img.mime, page.marks],
    { signal },
  );
}

const sweep = async (
  services: Services,
  bytes: Uint8Array,
  signal: AbortSignal,
) =>
  (
    await services.qpdf.optimize(
      bytes,
      { removeUnreferenced: true, objectStreams: 'generate' },
      signal,
    )
  ).bytes;

function failure(v: VerifyResult): ToolError {
  const pages = v.failedPages.map((p) => p + 1);
  const where = pages.length
    ? ` on ${plural(pages.length, 'page')} ${pages.join(', ')}`
    : '';
  return new ToolError(
    'VERIFICATION_FAILED',
    `Redaction could not be verified${where}. Nothing was changed. ${v.problems.join('. ')}.`,
  );
}

function documentFailure(v: VerifyResult): ToolError {
  const where = v.problems
    .filter((p) => p.startsWith('A search term remains in '))
    .map((p) => p.slice('A search term remains in '.length));
  return new ToolError(
    'VERIFICATION_FAILED',
    `Redaction could not be verified: a search term remains in ${[...new Set(where)].join(', ')}. Nothing was changed.`,
  );
}

function report(
  pages: PageMarks[],
  r: RedactPagesResult,
  rasterised: Map<number, (RasterReason | 'verification')[]>,
  v: VerifyResult,
): CheckpointReport {
  const marks = pages.reduce((n, p) => n + p.marks.length, 0);
  let title = `${marks} ${plural(marks, 'area')} on ${pages.length} ${plural(pages.length, 'page')}, verified`;
  if (rasterised.size)
    title += `, ${rasterised.size} ${plural(rasterised.size, 'page')} turned into ${plural(rasterised.size, 'an image', 'images')}`;
  const lines = r.pages.map((p) => {
    const parts = [`${p.marks} ${plural(p.marks, 'mark')}`];
    if (rasterised.has(p.pageIndex)) parts.push('turned into an image');
    else {
      parts.push(`${p.glyphs} ${plural(p.glyphs, 'character')} removed`);
      if (p.images)
        parts.push(`${p.images} ${plural(p.images, 'image')} changed`);
      if (p.paths) parts.push(`${p.paths} ${plural(p.paths, 'shape')} removed`);
    }
    if (p.annotations)
      parts.push(
        `${p.annotations} ${plural(p.annotations, 'annotation')} removed`,
      );
    return `Page ${p.pageIndex + 1}: ${parts.join(', ')}`;
  });
  for (const p of r.pages)
    if (p.clearedFields)
      lines.push(
        `Page ${p.pageIndex + 1}: ${p.clearedFields} form ${plural(p.clearedFields, 'field')} also shown on other pages ${p.clearedFields === 1 ? 'was' : 'were'} emptied everywhere, because ${p.clearedFields === 1 ? 'it was' : 'they were'} under a mark.`,
      );
  for (const item of r.scrubbed)
    lines.push(`Removed because it contained a search term: ${item}`);
  if (r.tagged)
    lines.push(
      'Tagged structure was removed because it can contain hidden copies of text.',
    );
  lines.push('Verified: no content remains under the marks.');
  if (v.kept.length)
    lines.push(
      'A search term left unmarked on other pages was searched for in the marked pages only, not in the whole file.',
    );
  const warnings = [...rasterised].map(
    ([page, reasons]) =>
      `Page ${page + 1} was turned into an image because ${RASTER_WORDS[reasons[0]]}. Run OCR to make it searchable again.`,
  );
  return {
    title,
    lines,
    warnings,
    rasterisedPages: [...rasterised.keys()].sort((a, b) => a - b),
    redactedPages: pages.map((p) => p.pageIndex),
  };
}

/** Runs apply, the rasterise fallback, the sweep and verification (spec 10.2, 10.3). */
export async function runRedaction(
  bytes: Uint8Array,
  params: RedactApplyParams,
  view: DocView,
  env: CheckpointEnv,
  steps: RedactSteps = { verify: verifyRedaction, rasterise: rasterisePage },
): Promise<{ bytes: Uint8Array; report: CheckpointReport }> {
  const { services, signal, progress } = env;
  const marked = marksFromView(view);
  const { terms } = marked;
  if (!marked.pages.length)
    throw new ToolError('INVALID_INPUT', 'Mark something to redact first');
  // Overlay text is drawn only after verification passes.
  const pages = withoutOverlayText(marked.pages);
  const total = pages.length + 3;
  progress({ done: 0, total, label: 'Removing content under the marks' });
  const r = await services.edit.call(
    'redactPages',
    [bytes.slice(), pages, terms],
    { signal },
  );
  const original = await services.render.open(bytes, signal);
  try {
    let out = r.bytes;
    const rasterised = new Map<number, (RasterReason | 'verification')[]>();
    const byIndex = new Map(pages.map((p) => [p.pageIndex, p]));
    for (const [k, need] of r.rasterNeeded.entries()) {
      progress({
        done: 1 + k,
        total,
        label: `Turning page ${need.pageIndex + 1} into an image`,
      });
      out = await steps.rasterise(
        services,
        original,
        out,
        byIndex.get(need.pageIndex)!,
        params.dpi,
        signal,
      );
      rasterised.set(need.pageIndex, need.reasons);
    }
    progress({ done: pages.length + 1, total, label: 'Checking the result' });
    out = await sweep(services, out, signal);
    let v = await steps.verify({ bytes: out, pages, terms }, services, signal);
    if (!v.ok) {
      // A term left in a document-level place cannot be fixed by turning
      // pages into images: refuse now and say where.
      if (v.documentLevel) throw documentFailure(v);
      // Raw bytes name no page: every marked page goes.
      const retry = (
        v.rawBytes ? pages.map((p) => p.pageIndex) : v.failedPages
      ).filter((i) => byIndex.has(i) && !rasterised.has(i));
      if (!retry.length) throw failure(v);
      for (const i of retry) {
        out = await steps.rasterise(
          services,
          original,
          out,
          byIndex.get(i)!,
          params.dpi,
          signal,
        );
        rasterised.set(i, ['verification']);
      }
      out = await sweep(services, out, signal);
      v = await steps.verify({ bytes: out, pages, terms }, services, signal);
      if (!v.ok) throw failure(v);
    }
    out = await services.edit.call(
      'drawOverlayText',
      [out.slice(), marked.pages],
      { signal },
    );
    progress({ done: total, total, label: 'Redactions verified' });
    return { bytes: out, report: report(pages, r, rasterised, v) };
  } finally {
    await services.render.close(original.docId);
  }
}

export const redactApplyRunner = defineCheckpointRunner<RedactApplyParams>({
  type: 'redact.apply',
  run: ({ bytes, params, view }, env) => runRedaction(bytes, params, view, env),
});
