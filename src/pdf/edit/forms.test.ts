import { describe, expect, it } from 'vitest';
import { PDFDocument, PDFHexString, PDFName } from 'pdf-lib';
import {
  makeFormPdf,
  makeTextPdf,
  makeXfaPdf,
  pdfPageTexts,
} from '../../../test/fixtures/builders';
import { fillForm, listFormFields, listFormWidgets } from './forms';

describe('listFormFields', () => {
  it('describes every AcroForm field', async () => {
    const fields = await listFormFields(await makeFormPdf());
    expect(fields.map((f) => [f.kind, f.name])).toEqual([
      ['text', 'name'],
      ['text', 'notes'],
      ['text', 'zip'],
      ['checkbox', 'agree'],
      ['radio', 'size'],
      ['dropdown', 'country'],
      ['optionlist', 'toppings'],
      ['text', 'ref'],
    ]);
    expect(fields[1]).toMatchObject({ multiline: true });
    expect(fields[2]).toMatchObject({ maxLength: 5, label: 'Postcode' });
    expect(fields[0]).toMatchObject({ label: null });
    expect(fields[4]).toMatchObject({
      options: ['S', 'M', 'L'],
      selected: null,
    });
    expect(fields[6]).toMatchObject({ multiSelect: true, selected: [] });
    expect(fields[7]).toMatchObject({ value: 'R-1', readOnly: true });
  });
  it('returns an empty list for a PDF without a form', async () => {
    expect(await listFormFields(await makeTextPdf({ pages: 1 }))).toEqual([]);
  });
  it('rejects XFA forms as unsupported (detected before pdf-lib strips them)', async () => {
    await expect(listFormFields(await makeXfaPdf())).rejects.toMatchObject({
      code: 'UNSUPPORTED_FEATURE',
      message:
        'This PDF uses an XFA form, which is not supported. Only standard (AcroForm) forms can be filled.',
    });
  });
});

describe('fillForm', () => {
  const values = {
    name: 'Ada Lovelace',
    notes: 'Line one\nLine two',
    zip: 'D02',
    agree: true,
    size: 'M',
    country: 'France',
    toppings: ['Cheese', 'Olives'],
  };
  it('fills every field kind and keeps the form editable', async () => {
    const out = await fillForm(await makeFormPdf(), values, { flatten: false });
    const form = (await PDFDocument.load(out)).getForm();
    expect(form.getTextField('name').getText()).toBe('Ada Lovelace');
    expect(form.getTextField('notes').getText()).toBe('Line one\nLine two');
    expect(form.getCheckBox('agree').isChecked()).toBe(true);
    expect(form.getRadioGroup('size').getSelected()).toBe('M');
    expect(form.getDropdown('country').getSelected()).toEqual(['France']);
    expect(form.getOptionList('toppings').getSelected()).toEqual([
      'Cheese',
      'Olives',
    ]);
  });
  it('flattens: no fields remain and the values are page text', async () => {
    const out = await fillForm(await makeFormPdf(), values, { flatten: true });
    expect((await PDFDocument.load(out)).getForm().getFields()).toHaveLength(0);
    expect((await pdfPageTexts(out))[0]).toContain('Ada Lovelace');
  });
  it('leaves read-only fields alone', async () => {
    const out = await fillForm(
      await makeFormPdf(),
      { ref: 'changed' },
      { flatten: false },
    );
    expect(
      (await PDFDocument.load(out)).getForm().getTextField('ref').getText(),
    ).toBe('R-1');
  });
  it.each([
    [{ zip: '123456' }, '"zip": at most 5 characters'],
    [{ size: 'XL' }, '"size": "XL" is not one of the options'],
    [{ name: 'Nº №' }, `"name": the form font can't draw №`],
    [{ agree: 'yes' }, '"agree": expected checked or unchecked'],
    [{ missing: 'x' }, 'There is no form field called "missing"'],
  ])('rejects %j', async (vals, message) => {
    await expect(
      fillForm(await makeFormPdf(), vals, { flatten: false }),
    ).rejects.toThrow(message);
  });
});

describe('fillForm with fields that rely on NeedAppearances', () => {
  /** An untouched field holding text Helvetica can't draw, with no appearance. */
  const legacyForm = async () => {
    const doc = await PDFDocument.load(await makeFormPdf());
    const field = doc.getForm().createTextField('legacy');
    field.addToPage(doc.getPage(0), { x: 320, y: 600, width: 120, height: 24 });
    field.acroField.dict.set(PDFName.of('V'), PDFHexString.fromText('Ада'));
    for (const w of field.acroField.getWidgets())
      w.dict.delete(PDFName.of('AP'));
    return doc.save({ updateFieldAppearances: false });
  };
  it('leaves untouched fields as they are when not flattening', async () => {
    const out = await fillForm(
      await legacyForm(),
      { name: 'Ada' },
      { flatten: false },
    );
    const form = (await PDFDocument.load(out)).getForm();
    expect(form.getTextField('name').getText()).toBe('Ada');
    expect(form.getTextField('legacy').getText()).toBe('Ада');
  });
  it('names the field it cannot flatten instead of a raw error', async () => {
    await expect(
      fillForm(await legacyForm(), { name: 'Ada' }, { flatten: true }),
    ).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      message: `"legacy": the form font can't draw its current value, so the form can't be flattened`,
    });
  });
});

describe('listFormWidgets', () => {
  it('lists one entry per widget with its page and /Rect', async () => {
    const widgets = await listFormWidgets(await makeFormPdf());
    expect(widgets.map((w) => w.fieldName)).toEqual([
      'name',
      'notes',
      'zip',
      'agree',
      'size',
      'size',
      'size',
      'country',
      'toppings',
      'ref',
    ]);
    expect(widgets.every((w) => w.pageIndex === 0)).toBe(true);
    // pdf-lib's addToPage widens the /Rect by half the 1pt border.
    expect(widgets[0]).toMatchObject({
      kind: 'text',
      rect: { x: 71.5, y: 699.5, width: 241, height: 25 },
      readOnly: false,
    });
    expect(
      widgets.filter((w) => w.kind === 'radio').map((w) => w.onValue),
    ).toEqual(['S', 'M', 'L']);
    expect(widgets[5].rect).toEqual({
      x: 111.5,
      y: 479.5,
      width: 17,
      height: 17,
    });
    expect(widgets.at(-1)).toMatchObject({ fieldName: 'ref', readOnly: true });
  });
  it('finds the page through /Annots when a widget has no /P', async () => {
    const doc = await PDFDocument.create();
    doc.addPage([300, 300]);
    const page = doc.addPage([300, 300]);
    const field = doc.getForm().createTextField('late');
    field.addToPage(page, { x: 10, y: 20, width: 100, height: 20 });
    field.acroField.getWidgets()[0].dict.delete(PDFName.of('P'));
    const widgets = await listFormWidgets(await doc.save());
    expect(widgets).toEqual([
      expect.objectContaining({ fieldName: 'late', pageIndex: 1 }),
    ]);
  });
  it('rejects XFA forms as unsupported', async () => {
    await expect(listFormWidgets(await makeXfaPdf())).rejects.toMatchObject({
      code: 'UNSUPPORTED_FEATURE',
    });
  });
});
