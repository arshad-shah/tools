import type { FormField, FormValue } from '@/pdf/edit';

export type FormValues = Record<string, FormValue>;

/** A fillable field's current value, in the shape its control edits. */
function currentValue(field: FormField): FormValue | undefined {
  switch (field.kind) {
    case 'text':
      return field.value;
    case 'checkbox':
      return field.checked;
    case 'radio':
      return field.selected ?? '';
    case 'dropdown':
    case 'optionlist':
      return field.multiSelect ? field.selected : (field.selected[0] ?? '');
    case 'unsupported':
      return undefined;
  }
}

export function initialValues(fields: FormField[]): FormValues {
  const out: FormValues = {};
  for (const f of fields) {
    const v = currentValue(f);
    if (v !== undefined) out[f.name] = v;
  }
  return out;
}

const same = (a: FormValue | undefined, b: FormValue | undefined) =>
  Array.isArray(a) && Array.isArray(b)
    ? a.length === b.length && a.every((v, i) => v === b[i])
    : a === b;

/** Only fields the user changed; read-only and unsupported fields never. */
export function changedValues(
  fields: FormField[],
  values: FormValues,
  initial: FormValues,
): FormValues {
  const out: FormValues = {};
  for (const f of fields) {
    if (f.kind === 'unsupported' || f.readOnly) continue;
    const v = values[f.name];
    if (v !== undefined && !same(v, initial[f.name])) out[f.name] = v;
  }
  return out;
}
