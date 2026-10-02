import { notify } from '@/shared/lib/notify';
import { ToolError, toToolError } from '@/shared/lib/errors';
import type { DocumentState } from '@/pdf/doc/model';
import { isOcrDetails, type OcrPageReport } from '@/pdf/doc/checkpoints/ocr';
import type { OcrTextLayerParams } from '@/pdf/doc/ops/ocr';
import type { CheckpointReport, DocView, PageId } from '@/pdf/doc/types';
import {
  hasCachedLanguage,
  loadOcrManifest,
  removeOcrData,
} from '@/pdf/ocr/assets';
import type { OcrLanguage } from '@/pdf/ocr/types';
import type { DocumentApi } from '../types';
import { getOcrUi, setOcrUi, type OcrUi } from './ui-store';

/** The checkpoint parameters for the current choices. */
export function ocrParams(
  ui: Pick<OcrUi, 'langs' | 'pages'>,
  view: DocView,
  selected: ReadonlySet<PageId>,
  current: PageId | null,
): OcrTextLayerParams {
  const first = current ? [current] : undefined;
  if (ui.pages !== 'selected')
    return {
      langs: [...ui.langs],
      pages: ui.pages,
      ...(first ? { first } : {}),
    };
  const pages = view.pages
    .filter((p) => selected.has(p.id) && !p.blank)
    .map((p) => p.id);
  if (!pages.length)
    throw new ToolError('INVALID_INPUT', 'Select the pages to run OCR on');
  return { langs: [...ui.langs], pages, ...(first ? { first } : {}) };
}

/** Whether every chosen language is stored; storage errors count as not stored. */
export async function checkCached(
  langs: readonly OcrLanguage[],
  has: (l: OcrLanguage) => Promise<boolean> = hasCachedLanguage,
): Promise<boolean> {
  try {
    const all = await Promise.all(langs.map((l) => has(l)));
    return all.every(Boolean);
  } catch {
    return false;
  }
}

/** Re-reads the stored state for the current languages. */
export async function refreshCached(): Promise<void> {
  const langs = getOcrUi().langs;
  const cached = await checkCached(langs);
  // Ignore an answer for languages changed meanwhile.
  if (getOcrUi().langs === langs) setOcrUi({ cached });
}

/** The manifest for the size line; a failure leaves the line without a size. */
export async function loadManifest(): Promise<void> {
  if (getOcrUi().manifest) return;
  try {
    setOcrUi({ manifest: await loadOcrManifest() });
  } catch {
    // The run itself reports NETWORK; the consent line simply names no size.
  }
}

export function setLanguages(langs: OcrLanguage[]): void {
  setOcrUi({ langs, cached: null, error: null });
  void refreshCached();
}

/**
 * Runs OCR (the consent is the click that got here). Failures stay in the
 * inspector with "Try again" (spec 13.3).
 */
export async function runOcr(
  doc: DocumentApi,
  selected: ReadonlySet<PageId>,
): Promise<void> {
  const ui = getOcrUi();
  if (ui.running) return;
  setOcrUi({ error: null, running: true, dismissed: false });
  try {
    const params = ocrParams(ui, doc.view, selected, doc.currentPage);
    await doc.runCheckpoint('ocr.textLayer', params, { title: 'Running OCR' });
  } catch (e) {
    const error = toToolError(e);
    setOcrUi({ error });
    doc.announce(error.message);
  } finally {
    setOcrUi({ running: false });
    void refreshCached();
  }
}

/** Deletes the stored language data and stops the engine (it reloads on the next run). */
export async function removeData(doc: DocumentApi): Promise<void> {
  try {
    await doc.services.ocr.dispose();
    await removeOcrData();
    setOcrUi({ cached: false });
    notify.success('OCR data removed from this device');
  } catch (e) {
    notify.error(toToolError(e));
  }
}

/** The latest OCR run at or before the undo cursor, with its per-page results. */
export function latestOcr(state: DocumentState): {
  report: CheckpointReport;
  pages: OcrPageReport[];
  sourceId: string;
} | null {
  const { log, cursor, checkpoints } = state;
  for (let i = Math.min(cursor, log.length) - 1; i >= 0; i--) {
    const op = log[i];
    if (op.type !== 'ocr.textLayer' || !op.checkpoint) continue;
    const meta = checkpoints.find((c) => c.id === op.checkpoint);
    if (!meta?.report) return null;
    const details = meta.report.details;
    return {
      report: meta.report,
      pages: isOcrDetails(details) ? details.pages : [],
      sourceId: meta.sourceId,
    };
  }
  return null;
}
