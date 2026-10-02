import type { IdbStore } from '@/shared/lib/storage';
import {
  autofillKey,
  type AutofillKey,
  type DetectedField,
} from '@/pdf/detect';
import type { FormWidget } from '@/pdf/edit/forms';

/** "My details" (spec §8.6): stored only on this device, not encrypted. */
export interface MyDetails {
  fullName: string;
  firstName: string;
  surname: string;
  address1: string;
  address2: string;
  address3: string;
  town: string;
  county: string;
  postcode: string;
  country: string;
  email: string;
  phone: string;
  /** ISO yyyy-mm-dd. */
  dob: string;
  nationality: string;
  occupation: string;
  /** Up to MAX_CUSTOM. */
  custom: { key: string; value: string }[];
}

export const MAX_CUSTOM = 10;
const STORE = 'profile';
const KEY = 'my-details';

export const EMPTY_DETAILS: MyDetails = {
  fullName: '',
  firstName: '',
  surname: '',
  address1: '',
  address2: '',
  address3: '',
  town: '',
  county: '',
  postcode: '',
  country: '',
  email: '',
  phone: '',
  dob: '',
  nationality: '',
  occupation: '',
  custom: [],
};

/** Field labels, exactly as the dialog shows them. */
export const DETAIL_LABELS: Record<AutofillKey, string> = {
  fullName: 'Full name',
  firstName: 'First name',
  surname: 'Surname',
  address1: 'Address line 1',
  address2: 'Address line 2',
  address3: 'Address line 3',
  town: 'Town or city',
  county: 'County or state',
  postcode: 'Postcode',
  country: 'Country',
  email: 'Email',
  phone: 'Phone',
  dob: 'Date of birth',
  nationality: 'Nationality',
  occupation: 'Occupation',
};

/** Keeps known string fields and at most MAX_CUSTOM custom rows. */
function clean(v: unknown): MyDetails | null {
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  const out: MyDetails = { ...EMPTY_DETAILS, custom: [] };
  for (const k of Object.keys(DETAIL_LABELS) as AutofillKey[])
    if (typeof o[k] === 'string') out[k] = o[k];
  if (Array.isArray(o.custom))
    out.custom = o.custom
      .filter(
        (c): c is { key: string; value: string } =>
          typeof c?.key === 'string' && typeof c?.value === 'string',
      )
      .slice(0, MAX_CUSTOM)
      .map(({ key, value }) => ({ key, value }));
  return out;
}

export async function loadMyDetails(db: IdbStore): Promise<MyDetails | null> {
  return clean(await db.get<unknown>(STORE, KEY));
}

export async function saveMyDetails(db: IdbStore, d: MyDetails): Promise<void> {
  await db.put(STORE, KEY, {
    ...d,
    custom: d.custom.filter((c) => c.key.trim() !== '').slice(0, MAX_CUSTOM),
  });
}

export async function clearMyDetails(db: IdbStore): Promise<void> {
  await db.delete(STORE, KEY);
}

/** DD/MM/YYYY (en-GB), or MM/DD/YYYY when the field's label asks for it. */
export function formatDob(iso: string, label: string | null): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const [, y, mo, d] = m;
  return /mm\s*[/.-]\s*dd/i.test(label ?? '')
    ? `${mo}/${d}/${y}`
    : `${d}/${mo}/${y}`;
}

/** The view id of an AcroForm text field in autofill plans. */
export const widgetFieldId = (fieldName: string) => `widget:${fieldName}`;

const humanise = (name: string) => name.replace(/[_.-]+/g, ' ').trim();

/**
 * What "Fill from My details" would fill (spec §8.6): every empty field
 * whose autofill key (or a custom detail's key, matched in its label) has a
 * stored value. Detected fields use their own ids; AcroForm text fields use
 * `widgetFieldId(name)`. Never applied without the preview step.
 */
export function autofillPlan(
  fields: DetectedField[],
  widgets: FormWidget[],
  values: MyDetails,
  filled: ReadonlySet<string>,
): { fieldId: string; label: string; value: string }[] {
  const valueFor = (key: AutofillKey | null, label: string | null) => {
    if (key) {
      const v = values[key].trim();
      if (v) return key === 'dob' ? formatDob(v, label) : v;
    }
    const text = (label ?? '').toLowerCase();
    const custom = values.custom.find(
      (c) => c.key.trim() && text.includes(c.key.trim().toLowerCase()),
    );
    return custom?.value.trim() || null;
  };
  const out: { fieldId: string; label: string; value: string }[] = [];
  for (const f of fields) {
    if (filled.has(f.id) || f.type === 'tick' || f.type === 'signature')
      continue;
    const value = valueFor(f.autofill, f.label);
    if (value) out.push({ fieldId: f.id, label: f.label ?? 'Field', value });
  }
  const seen = new Set<string>();
  for (const w of widgets) {
    const id = widgetFieldId(w.fieldName);
    if (w.kind !== 'text' || w.readOnly || seen.has(id) || filled.has(id))
      continue;
    seen.add(id);
    const label = humanise(w.fieldName);
    const value = valueFor(autofillKey(label), label);
    if (value) out.push({ fieldId: id, label, value });
  }
  return out;
}
