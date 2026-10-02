import type { DocumentState } from './model';
import { MODE_ORDER } from './modes';
import { getOperation } from './registry';
import type { DocView, ModeId, OpId, Operation } from './types';

/** One line per op type, plain words. */
export interface ModeSummary {
  mode: ModeId;
  lines: string[];
}

/** Overlay ops the current view still shows (not hidden, page still there). */
function visibleOverlays(view: DocView): Set<OpId> {
  const pages = new Set(view.pages.map((p) => p.id));
  const out = new Set<OpId>();
  for (const [pageId, items] of view.overlays)
    if (pages.has(pageId)) for (const item of items) out.add(item.opId);
  for (const item of view.docOverlays) out.add(item.opId);
  for (const id of view.hidden) out.delete(id);
  return out;
}

/** Pages a structure op touches or adds (page ids in its params). */
function touchedPages(params: unknown): string[] {
  const p = params as { pageIds?: unknown; newIds?: unknown } | null;
  const list = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  return [...list(p?.pageIds), ...list(p?.newIds)];
}

/**
 * What the export will change, grouped by mode (spec §6.4). Applied ops
 * only; overlay ops of the current segment count only while the view still
 * shows them (earlier segments are baked into their checkpoint), and so do
 * its page changes while one of their pages is still there. View-only
 * ops (`noOutput`) are not changes. Checkpoints contribute their report title.
 */
export function summarizeChanges(
  state: DocumentState,
  view: DocView,
): ModeSummary[] {
  const applied = state.log.slice(0, state.cursor);
  let segmentStart = 0;
  applied.forEach((op, i) => {
    if (op.checkpoint) segmentStart = i + 1;
  });
  const shown = visibleOverlays(view);
  const present = new Set(view.pages.map((p) => p.id));
  // mode -> type -> params, in first-appearance order.
  const byMode = new Map<ModeId, Map<string, unknown[]>>();
  const checkpointLines = new Map<ModeId, string[]>();
  applied.forEach((op: Operation, i) => {
    const def = getOperation(op.type);
    if (def.noOutput) return;
    if (def.kind === 'checkpoint') {
      const meta = state.checkpoints.find((c) => c.id === op.checkpoint);
      const lines = checkpointLines.get(def.mode) ?? [];
      lines.push(meta?.report?.title ?? op.label);
      checkpointLines.set(def.mode, lines);
      byMode.set(def.mode, byMode.get(def.mode) ?? new Map());
      return;
    }
    if (def.kind === 'overlay' && i >= segmentStart && !shown.has(op.id))
      return;
    if (
      def.kind === 'structure' &&
      i >= segmentStart &&
      op.type !== 'page.delete'
    ) {
      const touched = touchedPages(op.params);
      if (touched.length && !touched.some((id) => present.has(id))) return;
    }
    const types = byMode.get(def.mode) ?? new Map<string, unknown[]>();
    types.set(op.type, [...(types.get(op.type) ?? []), op.params]);
    byMode.set(def.mode, types);
  });
  return MODE_ORDER.filter((m) => byMode.has(m))
    .map((mode) => {
      const lines = [...byMode.get(mode)!].map(([type, params]) => {
        const def = getOperation(type);
        const n = params.length;
        return def.summarize
          ? def.summarize(params)
          : `${n} ${n === 1 ? 'change' : 'changes'}`;
      });
      // A definition may sum its ops up to nothing (a crop that was reset).
      return {
        mode,
        lines: [...lines, ...(checkpointLines.get(mode) ?? [])].filter(Boolean),
      };
    })
    .filter((s) => s.lines.length > 0);
}
