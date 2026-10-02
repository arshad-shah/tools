import { notify } from '@/shared/lib/notify';
import { toToolError } from '@/shared/lib/errors';
import type { DocumentApi, ModeProps } from '../types';
import { AREA_TOOL, markTotals } from './marks';
import { getRedactUi, setRedactUi } from './ui-store';

export const NOTHING_MARKED = 'Mark something to redact first';

/** null when Apply is possible, else the reason. */
export const applyBlocked = (doc: DocumentApi): string | null =>
  markTotals(doc.view).areas ? null : NOTHING_MARKED;

export const toggleArea = (ctx: Pick<ModeProps, 'tool'>) =>
  ctx.tool.set(ctx.tool.id === AREA_TOOL ? null : AREA_TOOL);

export const openSearch = () => setRedactUi({ searchOpen: true });

export const askApply = (doc: DocumentApi) => {
  if (applyBlocked(doc)) {
    notify.error(NOTHING_MARKED);
    return;
  }
  setRedactUi({ confirmOpen: true });
};

/** Runs the redact.apply checkpoint; a refused verification blocks with its message. */
export async function applyRedactions(doc: DocumentApi): Promise<void> {
  setRedactUi({ confirmOpen: false });
  try {
    const report = await doc.runCheckpoint(
      'redact.apply',
      { dpi: getRedactUi().dpi },
      { title: 'Applying redactions' },
    );
    if (!report) return;
    doc.announce('Redactions applied and verified');
    notify.success(report.title);
  } catch (e) {
    const err = toToolError(e);
    if (err.code === 'VERIFICATION_FAILED') setRedactUi({ failure: err });
    else notify.error(err);
  }
}
