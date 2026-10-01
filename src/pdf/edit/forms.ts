import {
  PDFButton,
  PDFCheckBox,
  PDFDict,
  PDFDropdown,
  PDFName,
  PDFOptionList,
  PDFRadioGroup,
  PDFSignature,
  PDFTextField,
  StandardFonts,
  type PDFDocument,
  type PDFField,
} from 'pdf-lib';
import { ToolError } from '@/shared/lib/errors';
import { unsupportedChars } from './fonts';
import { loadPdf } from './load';

export type FormField =
  | {
      kind: 'text';
      name: string;
      value: string;
      multiline: boolean;
      maxLength: number | null;
      readOnly: boolean;
    }
  | { kind: 'checkbox'; name: string; checked: boolean; readOnly: boolean }
  | {
      kind: 'radio';
      name: string;
      options: string[];
      selected: string | null;
      readOnly: boolean;
    }
  | {
      kind: 'dropdown';
      name: string;
      options: string[];
      selected: string[];
      multiSelect: boolean;
      editable: boolean;
      readOnly: boolean;
    }
  | {
      kind: 'optionlist';
      name: string;
      options: string[];
      selected: string[];
      multiSelect: boolean;
      readOnly: boolean;
    }
  | {
      kind: 'unsupported';
      name: string;
      type: 'button' | 'signature' | 'unknown';
    };

export type FormValue = string | boolean | string[];

export const XFA_MESSAGE =
  'This PDF uses an XFA form, which is not supported. Only standard (AcroForm) forms can be filled.';

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

function describe(field: PDFField): FormField {
  const name = field.getName();
  const readOnly = field.isReadOnly();
  if (field instanceof PDFTextField)
    return {
      kind: 'text',
      name,
      value: field.getText() ?? '',
      multiline: field.isMultiline(),
      maxLength: field.getMaxLength() ?? null,
      readOnly,
    };
  if (field instanceof PDFCheckBox)
    return { kind: 'checkbox', name, checked: field.isChecked(), readOnly };
  if (field instanceof PDFRadioGroup)
    return {
      kind: 'radio',
      name,
      options: field.getOptions(),
      selected: field.getSelected() ?? null,
      readOnly,
    };
  if (field instanceof PDFDropdown)
    return {
      kind: 'dropdown',
      name,
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
      options: field.getOptions(),
      selected: field.getSelected(),
      multiSelect: field.isMultiselect(),
      readOnly,
    };
  return {
    kind: 'unsupported',
    name,
    type:
      field instanceof PDFButton
        ? 'button'
        : field instanceof PDFSignature
          ? 'signature'
          : 'unknown',
  };
}

export async function listFormFields(bytes: Uint8Array): Promise<FormField[]> {
  const { form } = await loadForm(bytes);
  return form.getFields().map(describe);
}

export async function fillForm(
  bytes: Uint8Array,
  values: Record<string, FormValue>,
  { flatten }: { flatten: boolean },
): Promise<Uint8Array> {
  const { doc, form } = await loadForm(bytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const byName = new Map(form.getFields().map((f) => [f.getName(), f]));
  for (const [name, value] of Object.entries(values)) {
    const field = byName.get(name);
    if (!field)
      throw new ToolError(
        'INVALID_INPUT',
        `There is no form field called "${name}"`,
      );
    if (field.isReadOnly()) continue;
    const fail = (m: string) =>
      new ToolError('INVALID_INPUT', `"${name}": ${m}`);
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
      if (typeof value !== 'boolean')
        throw fail('expected checked or unchecked');
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
  form.updateFieldAppearances(font);
  if (flatten) form.flatten({ updateFieldAppearances: false });
  return doc.save({ useObjectStreams: true });
}
