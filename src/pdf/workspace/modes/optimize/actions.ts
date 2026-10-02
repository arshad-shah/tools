import { notify } from '@/shared/lib/notify';
import { toToolError } from '@/shared/lib/errors';
import type { DocumentState } from '@/pdf/doc/model';
import type { CheckpointReport, DocView } from '@/pdf/doc/types';
import type { DocumentApi } from '../types';
import { useOptimizeSettings } from './settings-store';

/** Runs the compress checkpoint with the chosen preset and settings. */
export async function compress(doc: DocumentApi): Promise<void> {
  const { preset, settings } = useOptimizeSettings.getState();
  try {
    await doc.runCheckpoint(
      'optimize.compress',
      { preset, settings },
      { title: 'Compressing' },
    );
  } catch (e) {
    notify.error(toToolError(e));
  }
}

/** Runs the qpdf full-rewrite checkpoint. */
export async function repair(doc: DocumentApi): Promise<void> {
  try {
    await doc.runCheckpoint('optimize.repair', {}, { title: 'Repairing' });
  } catch (e) {
    notify.error(toToolError(e));
  }
}

/**
 * The report of the Optimize checkpoint the document currently sits on, so
 * undo and redo show the matching result (or none).
 */
export function currentOptimizeResult(
  state: DocumentState,
  view: DocView,
): {
  type: 'optimize.compress' | 'optimize.repair';
  report: CheckpointReport;
} | null {
  const meta = state.checkpoints.find((c) => c.id === view.checkpoint);
  if (!meta?.opId || !meta.report) return null;
  const op = state.log.find((o) => o.id === meta.opId);
  if (op?.type === 'optimize.compress' || op?.type === 'optimize.repair')
    return { type: op.type, report: meta.report };
  return null;
}
