import { PDFName, PDFString, StandardFonts } from 'pdf-lib';
import { ToolError } from '@/shared/lib/errors';
import type { Box } from './draw';
import { loadPdf } from './load';
import { rebuildingSave } from './ops';

/** Same values as the detector's FieldType (kept local: pdf/edit stays independent). */
export type NewFieldType = 'text' | 'multiline' | 'tick' | 'date' | 'signature';

export interface NewField {
  pageIndex: number;
  rect: Box;
  type: NewFieldType;
  label: string | null;
  value?: string;
}

/** Lower-case words joined by '_' (non-letters dropped); 'field' without a label. */
export function fieldBaseName(label: string | null): string {
  const words = (label ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\s]+/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
  return words.length ? words.join('_') : 'field';
}

const TOOLTIP: Partial<Record<NewFieldType, string>> = {
  date: 'Date (DD/MM/YYYY)',
  signature: 'Signature',
};

/**
 * Writes real AcroForm widgets (spec §8.5 Make fillable): text, date and
 * signature become text fields (date and signature with a hint in /TU, not
 * format actions or /Sig fields), multiline text fields wrap, ticks become
 * checkboxes. Names come from labels, deduplicated with _2, _3. Current
 * values are set and appearances generated (NeedAppearances false).
 */
export async function createFields(
  bytes: Uint8Array,
  fields: NewField[],
): Promise<{ bytes: Uint8Array; names: string[] }> {
  const doc = await loadPdf(bytes);
  const form = doc.getForm();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const taken = new Set(form.getFields().map((f) => f.getName()));
  const pages = doc.getPages();
  const names: string[] = [];
  for (const f of fields) {
    const page = pages[f.pageIndex];
    if (!page) throw new ToolError('INVALID_INPUT', 'Page no longer exists');
    const base = fieldBaseName(f.label);
    let name = base;
    for (let n = 2; taken.has(name); n++) name = `${base}_${n}`;
    taken.add(name);
    names.push(name);
    const at = {
      x: f.rect.x,
      y: f.rect.y,
      width: f.rect.width,
      height: f.rect.height,
      borderWidth: 0,
      font,
    };
    if (f.type === 'tick') {
      const box = form.createCheckBox(name);
      box.addToPage(page, at);
      if (f.value) box.check();
      continue;
    }
    const field = form.createTextField(name);
    if (f.type === 'multiline') field.enableMultiline();
    const tip = TOOLTIP[f.type] ?? f.label;
    if (tip) field.acroField.dict.set(PDFName.of('TU'), PDFString.of(tip));
    field.addToPage(page, at);
    if (f.value) {
      try {
        field.setText(f.value);
      } catch (cause) {
        throw new ToolError(
          'INVALID_INPUT',
          `"${name}": the form font can't draw this value`,
          { cause },
        );
      }
    }
  }
  try {
    form.updateFieldAppearances(font);
  } catch (cause) {
    throw new ToolError(
      'INVALID_INPUT',
      "A field value can't be drawn with the form font",
      { cause },
    );
  }
  form.acroForm.dict.set(PDFName.of('NeedAppearances'), doc.context.obj(false));
  return { bytes: await rebuildingSave(doc), names };
}

/** AcroForm to page content (pdf-lib form.flatten); returns the field count. */
export async function flattenForm(
  bytes: Uint8Array,
): Promise<{ bytes: Uint8Array; fields: number }> {
  const doc = await loadPdf(bytes);
  const form = doc.getForm();
  const fields = form.getFields().length;
  const font = await doc.embedFont(StandardFonts.Helvetica);
  try {
    form.updateFieldAppearances(font);
    form.flatten({ updateFieldAppearances: false });
  } catch (cause) {
    throw new ToolError(
      'INVALID_INPUT',
      "A field value can't be drawn with the form font, so the form can't be flattened",
      { cause },
    );
  }
  return { bytes: await rebuildingSave(doc), fields };
}
