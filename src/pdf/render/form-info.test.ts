import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import {
  makeFormPdf,
  makeTextPdf,
  makeXfaPdf,
} from '../../../test/fixtures/builders';
import {
  makeSigFieldPdf,
  SIG_FIELD_NAME,
  SIG_FIELD_RECT,
} from '../../../test/fixtures/sig-field';
import { readFormInfo } from './form-info';

async function info(bytes: Uint8Array) {
  const task = getDocument({ data: bytes.slice(), verbosity: 0 });
  try {
    return await readFormInfo(await task.promise);
  } finally {
    await task.destroy();
  }
}

/** Text fields with auto (0) size, a set 9pt size, and 9 comb boxes. */
async function makeSizedFormPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const form = doc.getForm();
  // Real forms say "auto" with a 0 size: /Helv 0 Tf.
  const auto = form.createTextField('auto');
  auto.addToPage(page, { x: 72, y: 700, width: 240, height: 25 });
  auto.acroField.setDefaultAppearance('/Helv 0 Tf 0 g');
  const notes = form.createTextField('notes');
  notes.enableMultiline();
  notes.addToPage(page, { x: 72, y: 560, width: 400, height: 120 });
  notes.acroField.setDefaultAppearance('/Helv 0 Tf 0 g');
  const sized = form.createTextField('sized');
  sized.addToPage(page, { x: 72, y: 500, width: 240, height: 25 });
  sized.setFontSize(9);
  const ssn = form.createTextField('ssn');
  ssn.setMaxLength(9);
  ssn.enableCombing();
  ssn.addToPage(page, { x: 72, y: 440, width: 180, height: 20 });
  // Without this, pdf-lib's save swaps the auto (0) sizes for fitted ones.
  return doc.save({ updateFieldAppearances: false });
}

describe('readFormInfo', () => {
  it("reads each text field's font size (0 is auto) and comb boxes", async () => {
    const { widgets } = await info(await makeSizedFormPdf());
    const by = Object.fromEntries(widgets.map((w) => [w.fieldName, w]));
    expect(by.auto).toMatchObject({ fontSize: 0 });
    expect(by.sized).toMatchObject({ fontSize: 9 });
    expect(by.ssn).toMatchObject({ comb: true, maxLength: 9 });
    expect(by.auto.comb).toBeFalsy();
  });

  it('lists widgets with kinds, rects, values and options', async () => {
    const { hasAcroForm, hasXfa, widgets } = await info(await makeFormPdf());
    expect(hasAcroForm).toBe(true);
    expect(hasXfa).toBe(false);
    expect(widgets.map((w) => [w.fieldName, w.kind])).toEqual([
      ['name', 'text'],
      ['notes', 'text'],
      ['zip', 'text'],
      ['agree', 'checkbox'],
      ['size', 'radio'],
      ['size', 'radio'],
      ['size', 'radio'],
      ['country', 'dropdown'],
      ['toppings', 'optionlist'],
      ['ref', 'text'],
    ]);
    expect(widgets[0].rect).toEqual({
      x: 71.5,
      y: 699.5,
      width: 241,
      height: 25,
    });
    expect(widgets[1]).toMatchObject({ multiline: true });
    expect(widgets[2]).toMatchObject({ maxLength: 5 });
    expect(widgets[3]).toMatchObject({ value: false });
    expect(widgets[7]).toMatchObject({
      options: ['Ireland', 'France', 'Spain'],
    });
    expect(widgets[9]).toMatchObject({ value: 'R-1', readOnly: true });
  });

  it('lists /Sig widgets as signature fields', async () => {
    const { widgets } = await info(await makeSigFieldPdf());
    expect(widgets).toEqual([
      expect.objectContaining({
        fieldName: SIG_FIELD_NAME,
        kind: 'signature',
        pageIndex: 0,
        rect: SIG_FIELD_RECT,
      }),
    ]);
  });

  it('reports no form on a plain PDF and XFA where present', async () => {
    expect(await info(await makeTextPdf({ pages: 1 }))).toEqual({
      hasAcroForm: false,
      hasXfa: false,
      widgets: [],
    });
    expect((await info(await makeXfaPdf())).hasXfa).toBe(true);
  });
});
