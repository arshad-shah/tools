import type { PDFPage } from 'pdf-lib';
import { ToolError } from '@/shared/lib/errors';
import type { RpcContext } from '@/shared/lib/worker-rpc';
import type { DrawCtx } from '@/pdf/edit/draw';
import {
  FontCache,
  loadNotoFallbacks,
  loadNotoSans,
} from '@/pdf/edit/font-cache';
import { loadPdf } from '@/pdf/edit/load';
import { rebuilding, rebuildingSave } from '@/pdf/edit/ops';
import {
  arrangePages,
  setPageLabels,
  type ArrangeEntry,
} from '@/pdf/edit/pages';
import type {
  AssetId,
  OverlayItem,
  PageLabelRange,
  PageRef,
  SourceId,
} from '../types';
import { getMaterializer, PHASE_ORDER, type MaterializeCtx } from './registry';

export interface MaterializePlan {
  base: Uint8Array;
  baseSourceId: SourceId;
  /** Merged-in sources referenced by pages. */
  sources: Record<SourceId, Uint8Array>;
  assets: Record<AssetId, Uint8Array>;
  pages: PageRef[];
  /** null: leave the base's labels as they are (removed if pages moved). */
  pageLabels: readonly PageLabelRange[] | null;
  /** view.docOverlays + per-page overlays, log order (hidden excluded). */
  overlays: OverlayItem[];
  /** The exported file's name (header and footer {filename}). */
  filename?: string;
}

export interface MaterializeResult {
  bytes: Uint8Array;
  notes: string[];
}

const cancelled = () => new ToolError('CANCELLED', 'Cancelled');

/**
 * Builds the output PDF from the current checkpoint and the view (spec
 * §6.4): page order, rotation, boxes and labels from the page map, then
 * overlay writers by phase, then a full rewrite. Runs in the edit worker.
 * pdf-lib's raw failures become a plain INVALID_FILE (the cause kept).
 */
export function materialize(
  plan: MaterializePlan,
  rpc: RpcContext,
): Promise<MaterializeResult> {
  return rebuilding(() => build(plan, rpc));
}

async function build(
  plan: MaterializePlan,
  rpc: RpcContext,
): Promise<MaterializeResult> {
  // planFor never sends noOutput ops (view-only: object.move/remove, ...).
  const unknown = plan.overlays.find((o) => !getMaterializer(o.type));
  if (unknown)
    throw new ToolError(
      'INVALID_INPUT',
      `No writer for edit type ${unknown.type}`,
    );
  if (plan.pages.length === 0)
    throw new ToolError('INVALID_INPUT', 'There are no pages to export');
  const notes: string[] = [];
  const doc = await loadPdf(plan.base);
  const basePages = doc.getPages();
  // The base's first use of a page moves the original; repeats and
  // merged-in pages are copied, with one copyPages call per document.
  const wanted = new Map<SourceId, number[]>();
  const used = new Set<number>();
  const moved = new Set<PageRef>();
  for (const ref of plan.pages) {
    if (ref.blank) continue;
    if (ref.source === plan.baseSourceId) {
      if (!basePages[ref.index])
        throw new ToolError('INVALID_INPUT', 'Page no longer exists');
      if (!used.has(ref.index)) {
        used.add(ref.index);
        moved.add(ref);
        continue;
      }
    } else if (!plan.sources[ref.source])
      throw new ToolError(
        'INVALID_INPUT',
        'A merged file is missing from this document',
      );
    wanted.set(ref.source, [...(wanted.get(ref.source) ?? []), ref.index]);
  }
  const copies = new Map<SourceId, PDFPage[]>();
  for (const [id, indices] of wanted) {
    if (rpc.signal.aborted) throw cancelled();
    const src =
      id === plan.baseSourceId ? doc : await loadPdf(plan.sources[id]);
    copies.set(id, await doc.copyPages(src, indices));
  }
  const entries: ArrangeEntry[] = plan.pages.map((ref) => {
    if (ref.blank)
      return {
        page: { blank: ref.blank },
        rotate: ref.rotate,
        crop: ref.crop,
        size: ref.size,
      };
    const page = moved.has(ref)
      ? basePages[ref.index]
      : copies.get(ref.source)!.shift()!;
    return { page, rotate: ref.rotate, crop: ref.crop, size: ref.size };
  });
  const arranged = await arrangePages(doc, entries);
  notes.push(...arranged.notes);
  if (plan.pageLabels !== null)
    setPageLabels(doc, plan.pageLabels.length ? plan.pageLabels : null);
  const byId = new Map(plan.pages.map((p, i) => [p.id, arranged.pages[i]]));
  const draw: DrawCtx = {
    doc,
    fonts: new FontCache(doc, loadNotoSans, loadNotoFallbacks),
  };
  const ctx: MaterializeCtx = {
    doc,
    draw,
    page: (id) => byId.get(id) ?? null,
    asset(id) {
      const bytes = plan.assets[id];
      if (!bytes)
        throw new ToolError(
          'INVALID_INPUT',
          'An image used in this document is missing',
        );
      return bytes;
    },
    note: (t) => notes.push(t),
    ...(plan.filename !== undefined ? { filename: plan.filename } : {}),
  };
  for (const phase of PHASE_ORDER) {
    const items = plan.overlays.filter(
      (o) => getMaterializer(o.type)!.phase === phase,
    );
    for (const [i, o] of items.entries()) {
      if (rpc.signal.aborted) throw cancelled();
      await getMaterializer(o.type)!.apply(ctx, o.params, {
        id: o.opId,
        ...(o.at !== undefined ? { at: o.at } : {}),
      });
      rpc.progress({ done: i + 1, total: items.length, label: phase });
    }
  }
  if (rpc.signal.aborted) throw cancelled();
  return { bytes: await rebuildingSave(doc), notes };
}
