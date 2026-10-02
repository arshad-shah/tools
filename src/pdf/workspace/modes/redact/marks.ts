import type { RedactMarkParams } from '@/pdf/doc/ops/redact';
import { plural } from '@/pdf/doc/ops/validate';
import type { DocumentState } from '@/pdf/doc/model';
import type {
  CheckpointReport,
  DocView,
  OverlayItem,
  PageId,
} from '@/pdf/doc/types';

/** The redaction marks the view shows on a page (removed ones excluded). */
export function pageMarks(
  view: DocView,
  pageId: PageId,
): (OverlayItem & { params: RedactMarkParams })[] {
  return (view.overlays.get(pageId) ?? []).filter(
    (o): o is OverlayItem & { params: RedactMarkParams } =>
      o.type === 'redact.mark' && !view.hidden.has(o.opId),
  );
}

/** Areas and pages marked across the document. */
export function markTotals(view: DocView): { areas: number; pages: number } {
  let areas = 0;
  let pages = 0;
  for (const p of view.pages) {
    const n = pageMarks(view, p.id).reduce(
      (s, m) => s + m.params.rects.length,
      0,
    );
    areas += n;
    if (n) pages++;
  }
  return { areas, pages };
}

/** The "Mark area" tool id. */
export const AREA_TOOL = 'redact-area';

/** "Removes the content under N marks on M pages" (spec 10.1). */
export function applyMessage(areas: number, pages: number): string {
  return `Removes the content under ${areas} ${plural(areas, 'mark')} on ${pages} ${plural(pages, 'page')}. You can undo until you export.`;
}

/** The latest applied (not undone) redaction's report and its checkpoint source. */
export function latestRedaction(doc: {
  state: DocumentState;
}): { report: CheckpointReport; sourceId: string } | null {
  const { log, cursor, checkpoints } = doc.state;
  for (let i = Math.min(cursor, log.length) - 1; i >= 0; i--) {
    const op = log[i];
    if (op.type !== 'redact.apply' || !op.checkpoint) continue;
    const meta = checkpoints.find((c) => c.id === op.checkpoint);
    return meta?.report
      ? { report: meta.report, sourceId: meta.sourceId }
      : null;
  }
  return null;
}
