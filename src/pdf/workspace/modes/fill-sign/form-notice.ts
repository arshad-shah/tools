import { XFA_MESSAGE } from '@/pdf/edit/messages';
import type { FormInfo } from '@/pdf/render/form-info';

/**
 * What to say about the form, if anything. Only an XFA-only form gets the
 * XFA warning: a hybrid (XFA beside a full AcroForm, as on IRS forms) fills
 * through its AcroForm fields like any other form.
 */
export function formNotice(
  info: FormInfo | undefined,
  formError: { message: string } | null,
): { status: 'warning' | 'danger'; message: string } | null {
  if (formError) return { status: 'danger', message: formError.message };
  if (info?.hasXfa && info.widgets.length === 0)
    return {
      status: 'warning',
      message: `${XFA_MESSAGE} You can still type, tick and sign anywhere on the page.`,
    };
  return null;
}
