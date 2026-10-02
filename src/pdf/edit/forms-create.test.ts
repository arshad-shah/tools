import { describe, expect, it } from 'vitest';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { makeFormPdf, makeTextPdf } from '../../../test/fixtures/builders';
import { createFields, fieldBaseName, flattenForm } from './forms-create';
import { listFormFields } from './forms';

async function widgets(bytes: Uint8Array) {
  const task = getDocument({ data: bytes.slice(), verbosity: 0 });
  try {
    const pdf = await task.promise;
    const annots = await (await pdf.getPage(1)).getAnnotations();
    return annots
      .filter((a) => a.subtype === 'Widget')
      .map((a) => ({
        name: a.fieldName as string,
        rect: a.rect as number[],
        type: a.fieldType as string,
      }));
  } finally {
    await task.destroy();
  }
}

describe('createFields', () => {
  it('names fields from labels, deduplicated, with real widgets at the rects', async () => {
    const base = await makeTextPdf({ pages: 1 });
    const rects = [
      { x: 100, y: 700, width: 200, height: 20 },
      { x: 100, y: 660, width: 200, height: 20 },
      { x: 100, y: 620, width: 12, height: 12 },
    ];
    const out = await createFields(base, [
      {
        pageIndex: 0,
        rect: rects[0],
        type: 'text',
        label: 'Name',
        value: 'Ada',
      },
      { pageIndex: 0, rect: rects[1], type: 'date', label: 'Name' },
      { pageIndex: 0, rect: rects[2], type: 'tick', label: '', value: 'yes' },
    ]);
    expect(out.names).toEqual(['name', 'name_2', 'field']);
    const found = await widgets(out.bytes);
    expect(found.map((w) => [w.name, w.type])).toEqual([
      ['name', 'Tx'],
      ['name_2', 'Tx'],
      ['field', 'Btn'],
    ]);
    found.forEach((w, i) => {
      const r = rects[i];
      [r.x, r.y, r.x + r.width, r.y + r.height].forEach((v, k) =>
        expect(Math.abs(w.rect[k] - v)).toBeLessThanOrEqual(0.5),
      );
    });
    const fields = await listFormFields(out.bytes);
    expect(fields[0]).toMatchObject({ value: 'Ada' });
    expect(fields[1]).toMatchObject({ label: 'Date (DD/MM/YYYY)' });
    expect(fields[2]).toMatchObject({ checked: true });
  });

  it('builds names from words only', () => {
    expect(fieldBaseName('Forename(s)')).toBe('forename_s');
    expect(fieldBaseName('Date of birth:')).toBe('date_of_birth');
    expect(fieldBaseName(null)).toBe('field');
  });

  it('avoids names the form already uses', async () => {
    const out = await createFields(await makeFormPdf(), [
      {
        pageIndex: 0,
        rect: { x: 300, y: 300, width: 100, height: 20 },
        type: 'multiline',
        label: 'Notes',
      },
    ]);
    expect(out.names).toEqual(['notes_2']);
  });
});

describe('flattenForm', () => {
  it('turns fields into page content', async () => {
    const out = await flattenForm(await makeFormPdf());
    expect(out.fields).toBe(8);
    expect(await listFormFields(out.bytes)).toEqual([]);
  });
});
