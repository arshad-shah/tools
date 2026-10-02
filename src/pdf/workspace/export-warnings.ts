import type { DocumentState } from '@/pdf/doc/model';
import type { DocView } from '@/pdf/doc/types';

const pagesList = (pages: number[]) =>
  pages.length === 1
    ? `Page ${pages[0]} was`
    : `Pages ${pages.slice(0, -1).join(', ')} and ${pages[pages.length - 1]} were`;

/**
 * What the user must know before exporting (spec §6.4): pages a checkpoint
 * turned into images, its other warnings, and an encrypted input exported
 * without a password (unless Protect is set).
 */
export function exportWarnings(state: DocumentState, view: DocView): string[] {
  const out: string[] = [];
  const applied = state.log.slice(0, state.cursor);
  for (const op of applied) {
    if (!op.checkpoint) continue;
    const report = state.checkpoints.find(
      (c) => c.id === op.checkpoint,
    )?.report;
    if (!report) continue;
    if (report.rasterisedPages?.length)
      out.push(
        `${pagesList(report.rasterisedPages)} turned into images during ${report.title.toLowerCase()}`,
      );
    out.push(...report.warnings);
  }
  const protectedOnExport = view.docOverlays.some(
    (o) => o.type === 'protect.set' && !view.hidden.has(o.opId),
  );
  if (state.encryptedInput && !protectedOnExport)
    out.push(
      'This document was opened with a password. The exported file is not password-protected.',
    );
  if (state.ownerRestricted && !protectedOnExport)
    out.push(
      'This PDF had owner restrictions. The exported file does not keep them.',
    );
  return [...new Set(out)];
}
