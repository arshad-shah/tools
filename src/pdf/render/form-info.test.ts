import { describe, expect, it } from 'vitest';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import {
  makeFormPdf,
  makeTextPdf,
  makeXfaPdf,
} from '../../../test/fixtures/builders';
import { readFormInfo } from './form-info';

async function info(bytes: Uint8Array) {
  const task = getDocument({ data: bytes.slice(), verbosity: 0 });
  try {
    return await readFormInfo(await task.promise);
  } finally {
    await task.destroy();
  }
}

describe('readFormInfo', () => {
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

  it('reports no form on a plain PDF and XFA where present', async () => {
    expect(await info(await makeTextPdf({ pages: 1 }))).toEqual({
      hasAcroForm: false,
      hasXfa: false,
      widgets: [],
    });
    expect((await info(await makeXfaPdf())).hasXfa).toBe(true);
  });
});
