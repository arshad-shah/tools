import { notify } from '@/shared/lib/notify';
import { toToolError } from '@/shared/lib/errors';
import { autofillPlan, loadMyDetails } from '@/pdf/doc/profile';
import type { NewOperation } from '@/pdf/doc/types';
import { getWorkspaceDb } from '../../workspace-db';
import { valueOp } from './actions';
import type { AutofillRow } from './AutofillPreview';
import type { ViewField } from './fields';
import { fillSign } from './store';

/** Autofill inputs from the view's fields (detected by key, widgets by name). */
export function autofillInputs(fields: readonly ViewField[]) {
  const detected = fields
    .filter((f) => f.origin === 'detected' && f.status === 'field')
    .map((f) => ({
      ...f.detected!,
      id: f.key,
      rect: f.rect,
      type: f.detected!.type,
      label: f.label,
      autofill: f.autofill,
    }));
  const widgets = fields
    .filter((f) => f.origin === 'widget' && f.widget)
    .map((f) => ({
      fieldName: f.widget!.fieldName,
      kind: f.widget!.kind,
      pageIndex: f.widget!.pageIndex,
      rect: f.rect,
      readOnly: f.widget!.readOnly,
    }));
  const filled = new Set(
    fields
      .filter((f) => f.filled)
      .map((f) =>
        f.origin === 'widget' ? `widget:${f.widget!.fieldName}` : f.key,
      ),
  );
  return { detected, widgets, filled };
}

/** The op an autofill row writes. */
export function autofillOp(
  fields: readonly ViewField[],
  row: AutofillRow,
): NewOperation | null {
  if (row.fieldId.startsWith('widget:')) {
    const name = row.fieldId.slice('widget:'.length);
    return {
      type: 'form.setValue',
      params: { name, value: row.value, label: row.label },
    };
  }
  const f = fields.find((x) => x.key === row.fieldId);
  return f ? valueOp(f, row.value) : null;
}

/**
 * "My details": with nothing stored, the details dialog; otherwise the
 * autofill preview of every empty field a stored value matches.
 */
export async function openMyDetails(fields: readonly ViewField[]) {
  try {
    const db = await getWorkspaceDb();
    const details = db ? await loadMyDetails(db) : null;
    if (!details) {
      fillSign.set({ dialog: 'details' });
      return;
    }
    const { detected, widgets, filled } = autofillInputs(fields);
    fillSign.set({
      autofillRows: autofillPlan(detected, widgets, details, filled),
      dialog: 'autofill',
    });
  } catch (e) {
    notify.error(toToolError(e));
  }
}
