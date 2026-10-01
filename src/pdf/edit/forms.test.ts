import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  makeFormPdf,
  makeTextPdf,
  makeXfaPdf,
  pdfPageTexts,
} from '../../../test/fixtures/builders';
import { fillForm, listFormFields } from './forms';

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
    expect(fields[2]).toMatchObject({ maxLength: 5 });
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
