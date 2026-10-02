import {
  PDFButton,
  PDFCheckBox,
  PDFDict,
  PDFDropdown,
  PDFHexString,
  PDFName,
  PDFOptionList,
  PDFRadioGroup,
  PDFRef,
  PDFSignature,
  PDFString,
  PDFTextField,
  StandardFonts,
  type PDFDocument,
  type PDFField,
  type PDFFont,
  type PDFForm,
} from 'pdf-lib';
import { ToolError } from '@/shared/lib/errors';
import type { Box } from './draw';
import { unsupportedChars } from './fonts';
import { loadPdf } from './load';
import { XFA_MESSAGE } from './messages';

/**
 * `name` is the fully qualified field name; `label` is the field's alternate
 * (user-facing) name, /TU, when the form has one.
 */
export type FormField =
  | {
      kind: 'text';
      name: string;
      label: string | null;
      value: string;
      multiline: boolean;
      maxLength: number | null;
      readOnly: boolean;
    }
  | {
      kind: 'checkbox';
      name: string;
      label: string | null;
      checked: boolean;
      readOnly: boolean;
    }
  | {
      kind: 'radio';
      name: string;
      label: string | null;
      options: string[];
      selected: string | null;
      readOnly: boolean;
    }
  | {
      kind: 'dropdown';
      name: string;
      label: string | null;
      options: string[];
      selected: string[];
      multiSelect: boolean;
      editable: boolean;
      readOnly: boolean;
    }
  | {
      kind: 'optionlist';
      name: string;
      label: string | null;
      options: string[];
      selected: string[];
      multiSelect: boolean;
      readOnly: boolean;
    }
  | {
      kind: 'unsupported';
      name: string;
      label: string | null;
      type: 'button' | 'signature' | 'unknown';
    };

export type FormValue = string | boolean | string[];

export { XFA_MESSAGE };

/** Must run before doc.getForm(): pdf-lib deletes XFA data when it builds the form. */
function hasXfa(doc: PDFDocument): boolean {
  return (
    doc.catalog
      .lookupMaybe(PDFName.of('AcroForm'), PDFDict)
      ?.has(PDFName.of('XFA')) ?? false
  );
}

async function loadForm(bytes: Uint8Array) {
  const doc = await loadPdf(bytes);
  if (hasXfa(doc)) throw new ToolError('UNSUPPORTED_FEATURE', XFA_MESSAGE);
  return { doc, form: doc.getForm() };
}

/** The field's /TU (alternate name shown to users), if it has a usable one. */
function alternateName(field: PDFField): string | null {
  const tu = field.acroField.dict.lookup(PDFName.of('TU'));
  if (!(tu instanceof PDFString || tu instanceof PDFHexString)) return null;
  const text = tu.decodeText().replace(/\s+/g, ' ').trim();
  return text || null;
}

function describe(field: PDFField): FormField {
  const name = field.getName();
  const readOnly = field.isReadOnly();
  const label = alternateName(field);
  if (field instanceof PDFTextField)
    return {
      kind: 'text',
      name,
      label,
      value: field.getText() ?? '',
      multiline: field.isMultiline(),
      maxLength: field.getMaxLength() ?? null,
      readOnly,
    };
  if (field instanceof PDFCheckBox)
    return {
      kind: 'checkbox',
      name,
      label,
      checked: field.isChecked(),
      readOnly,
    };
  if (field instanceof PDFRadioGroup)
    return {
      kind: 'radio',
      name,
      label,
      options: field.getOptions(),
      selected: field.getSelected() ?? null,
      readOnly,
    };
  if (field instanceof PDFDropdown)
    return {
      kind: 'dropdown',
      name,
      label,
      options: field.getOptions(),
      selected: field.getSelected(),
      multiSelect: field.isMultiselect(),
      editable: field.isEditable(),
      readOnly,
    };
  if (field instanceof PDFOptionList)
    return {
      kind: 'optionlist',
      name,
      label,
      options: field.getOptions(),
      selected: field.getSelected(),
      multiSelect: field.isMultiselect(),
      readOnly,
    };
  return {
    kind: 'unsupported',
    name,
    label,
    type:
      field instanceof PDFButton
        ? 'button'
        : field instanceof PDFSignature
          ? 'signature'
          : 'unknown',
  };
}

/** One widget of a form field, in page space (radios have one per option). */
export interface FormWidget {
  fieldName: string;
  kind: FormField['kind'];
  pageIndex: number;
  rect: Box;
  readOnly: boolean;
  /** A checkbox's or radio option's on-state value. */
  onValue?: string;
}

/**
 * Every widget of every field with its page and /Rect. The page comes from
 * the widget's /P or, when that is missing, from the page whose /Annots
 * lists the widget. Widgets on no page are skipped.
 */
export async function listFormWidgets(
  bytes: Uint8Array,
): Promise<FormWidget[]> {
  const { doc, form } = await loadForm(bytes);
  const pages = doc.getPages();
  const byPageRef = new Map(pages.map((p, i) => [p.ref.toString(), i]));
  const annotPage = new Map<string, number>();
  pages.forEach((p, i) => {
    const annots = p.node.Annots();
    if (!annots) return;
    for (let k = 0; k < annots.size(); k++) {
      const ref = annots.get(k);
      if (ref instanceof PDFRef) annotPage.set(ref.toString(), i);
    }
  });
  const out: FormWidget[] = [];
  for (const field of form.getFields()) {
    const kind = describe(field).kind;
    const readOnly = field.isReadOnly();
    // Radio on-states may be indices into /Opt; getOptions maps them back.
    const options = field instanceof PDFRadioGroup ? field.getOptions() : null;
    for (const [w, widget] of field.acroField.getWidgets().entries()) {
      const p = widget.P();
      const ref = doc.context.getObjectRef(widget.dict);
      const pageIndex =
        (p ? byPageRef.get(p.toString()) : undefined) ??
        (ref ? annotPage.get(ref.toString()) : undefined);
      if (pageIndex === undefined) continue;
      const r = widget.getRectangle();
      const on = options?.[w] ?? widget.getOnValue()?.decodeText();
      out.push({
        fieldName: field.getName(),
        kind,
        pageIndex,
        rect: { x: r.x, y: r.y, width: r.width, height: r.height },
        readOnly,
        ...(on !== undefined && (kind === 'checkbox' || kind === 'radio')
          ? { onValue: on }
          : {}),
      });
    }
  }
  return out;
}

export async function listFormFields(bytes: Uint8Array): Promise<FormField[]> {
  const { form } = await loadForm(bytes);
  return form.getFields().map(describe);
}

/**
 * Sets one field's value (the per-field body of fillForm, shared by the
 * workspace's form.setValue writer). Read-only fields are left alone.
 * Throws INVALID_INPUT naming the field for a value it can't take.
 */
export function setFieldValue(
  form: PDFForm,
  name: string,
  value: FormValue,
  font: PDFFont,
): void {
  let field: PDFField;
  try {
    field = form.getField(name);
  } catch {
    throw new ToolError(
      'INVALID_INPUT',
      `There is no form field called "${name}"`,
    );
  }
  if (field.isReadOnly()) return;
  const fail = (m: string) => new ToolError('INVALID_INPUT', `"${name}": ${m}`);
  const checkChars = (s: string) => {
    const bad = unsupportedChars(font, s.replace(/[\r\n]/g, ''));
    if (bad.length) throw fail(`the form font can't draw ${bad.join(' ')}`);
  };
  const asList = (v: FormValue): string[] => {
    if (typeof v === 'string') return v ? [v] : [];
    if (Array.isArray(v)) return v;
    throw fail('expected a choice');
  };
  if (field instanceof PDFTextField) {
    if (typeof value !== 'string') throw fail('expected text');
    const max = field.getMaxLength();
    if (max !== undefined && value.length > max)
      throw fail(`at most ${max} characters`);
    checkChars(value);
    field.setText(value || undefined);
  } else if (field instanceof PDFCheckBox) {
    if (typeof value !== 'boolean') throw fail('expected checked or unchecked');
    if (value) field.check();
    else field.uncheck();
  } else if (field instanceof PDFRadioGroup) {
    if (typeof value !== 'string') throw fail('expected one option');
    if (!value) field.clear();
    else if (!field.getOptions().includes(value))
      throw fail(`"${value}" is not one of the options`);
    else field.select(value);
  } else if (field instanceof PDFDropdown || field instanceof PDFOptionList) {
    const list = asList(value);
    const editable = field instanceof PDFDropdown && field.isEditable();
    for (const v of list) {
      if (!editable && !field.getOptions().includes(v))
        throw fail(`"${v}" is not one of the options`);
      checkChars(v);
    }
    if (list.length > 1 && !field.isMultiselect())
      throw fail('only one choice is allowed');
    if (list.length === 0) field.clear();
    else field.select(list.length === 1 ? list[0] : list);
  } else {
    throw fail('this kind of field cannot be filled here');
  }
}

export async function fillForm(
  bytes: Uint8Array,
  values: Record<string, FormValue>,
  { flatten }: { flatten: boolean },
): Promise<Uint8Array> {
  const { doc, form } = await loadForm(bytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const [name, value] of Object.entries(values))
    setFieldValue(form, name, value, font);
  // Redraw only what needs it: the fields just changed (their values were
  // checked above) and, when flattening, untouched fields that have no
  // appearance yet (forms relying on NeedAppearances). Anything else keeps
  // its own appearance, and an untouched value Helvetica can't draw is left
  // alone rather than failing with a raw pdf-lib error.
  const changed = new Set(Object.keys(values));
  for (const field of form.getFields()) {
    if (!field.needsAppearancesUpdate()) continue;
    if (!changed.has(field.getName()) && !flatten) continue;
    try {
      field.defaultUpdateAppearances(font);
    } catch (cause) {
      throw new ToolError(
        'INVALID_INPUT',
        `"${field.getName()}": the form font can't draw its current value${flatten ? ", so the form can't be flattened" : ''}`,
        { cause },
      );
    }
  }
  if (flatten) form.flatten({ updateFieldAppearances: false });
  return doc.save({ useObjectStreams: true, updateFieldAppearances: false });
}

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
