import { beforeAll, describe, expect, it } from 'vitest';
import type { DetectedField } from '@/pdf/detect';
import { mergeDetection } from '@/pdf/doc/detection';
import { registerCoreOperations } from '@/pdf/doc/ops';
import { makeModel } from '@/pdf/doc/test-helpers';
import type { FormInfo } from '@/pdf/render/form-info';
import {
  detectedKey,
  fieldName,
  shownFields,
  viewFields,
  type ViewField,
} from './fields';

beforeAll(() => registerCoreOperations());

const detected = (
  id: string,
  y: number,
  patch: Partial<DetectedField> = {},
): DetectedField => ({
  id,
  pageIndex: 0,
  rect: { x: 210, y, width: 300, height: 20 },
  type: 'text',
  label: id,
  autofill: null,
  confidence: 0.9,
  status: 'field',
  source: 'cell',
  ...patch,
});

function setup(fields: DetectedField[], forms: Record<string, FormInfo> = {}) {
  const model = makeModel();
  model.setDetection(
    mergeDetection(undefined, 's0', {
      pageIndex: 0,
      fields,
      skipped: null,
      ms: 1,
    }),
  );
  const get = () =>
    viewFields(
      model.getView(),
      's0',
      model.getState().detection as never,
      forms,
    );
  return { model, get };
}

describe('viewFields', () => {
  it('lists detected fields with view keys and fills', () => {
    const { model, get } = setup([detected('Surname', 700)]);
    const [f] = get();
    expect(f.key).toBe(detectedKey('ckpt0:0', 'Surname'));
    expect(fieldName(f)).toBe('Text field: Surname, empty');
    model.dispatch({
      type: 'flat.fill',
      params: {
        id: 'x',
        pageId: 'ckpt0:0',
        rect: f.rect,
        kind: 'text',
        value: 'Doe',
        fieldId: f.key,
      },
    });
    expect(get()[0]).toMatchObject({ value: 'Doe', filled: true });
    expect(fieldName(get()[0])).toBe('Text field: Surname, filled');
  });

  it('applies corrections: dismiss, accept, retype, add', () => {
    const { model, get } = setup([
      detected('A', 700),
      detected('B', 650, { status: 'suggested' }),
    ]);
    const [a, b] = get();
    model.dispatch({
      type: 'detect.correct',
      params: { action: 'dismiss', fieldIds: [a.key] },
    });
    model.dispatch({
      type: 'detect.correct',
      params: { action: 'accept', fieldIds: [b.key] },
    });
    model.dispatch({
      type: 'detect.correct',
      params: { action: 'retype', fieldIds: [b.key], type: 'date' },
    });
    model.dispatch({
      type: 'detect.correct',
      params: {
        action: 'add',
        fieldIds: [],
        pageId: 'ckpt0:1',
        field: detected('new', 100),
      },
    });
    const now = get();
    expect(now.map((f) => [f.label, f.status, f.type, f.pageNumber])).toEqual([
      ['B', 'field', 'date', 1],
      ['new', 'field', 'text', 2],
    ]);
  });

  it('shows widgets with their values and drops overlapping detections', () => {
    const forms: Record<string, FormInfo> = {
      s0: {
        hasAcroForm: true,
        hasXfa: false,
        widgets: [
          {
            fieldName: 'name',
            kind: 'text',
            pageIndex: 0,
            rect: { x: 210, y: 700, width: 300, height: 20 },
            readOnly: false,
            value: 'Ada',
            label: null,
          },
        ],
      },
    };
    const { model, get } = setup(
      [detected('dup', 700), detected('other', 500)],
      forms,
    );
    expect(get().map((f) => [f.origin, f.label, f.value])).toEqual([
      ['widget', 'name', 'Ada'],
      ['detected', 'other', ''],
    ]);
    model.dispatch({
      type: 'form.setValue',
      params: { name: 'name', value: 'Grace' },
    });
    expect(get()[0].value).toBe('Grace');
  });

  it("leaves a widget's own value to the page, and covers it once changed", () => {
    // The page render already draws the PDF's appearance of "R-1"; drawing
    // the value again doubled it. A changed value hides the old one.
    const forms: Record<string, FormInfo> = {
      s0: {
        hasAcroForm: true,
        hasXfa: false,
        widgets: [
          {
            fieldName: 'ref',
            kind: 'text',
            pageIndex: 0,
            rect: { x: 210, y: 700, width: 300, height: 20 },
            readOnly: false,
            value: 'R-1',
            label: null,
          },
          {
            fieldName: 'blank',
            kind: 'text',
            pageIndex: 0,
            rect: { x: 210, y: 600, width: 300, height: 20 },
            readOnly: false,
            value: '',
            label: null,
          },
        ],
      },
    };
    const { model, get } = setup([], forms);
    expect(get()[0]).toMatchObject({ value: 'R-1', drawnByPage: true });
    expect(get()[1].drawnByPage).toBeFalsy();
    model.dispatch({
      type: 'form.setValue',
      params: { name: 'ref', value: 'R-2' },
    });
    expect(get()[0]).toMatchObject({
      value: 'R-2',
      drawnByPage: false,
      coversPage: true,
    });
    model.dispatch({
      type: 'form.setValue',
      params: { name: 'blank', value: 'x' },
    });
    expect(get()[1].coversPage).toBeFalsy();
  });

  it('names each radio option by its value', () => {
    const radio = (onValue: string, x: number) => ({
      fieldName: 'size',
      kind: 'radio' as const,
      pageIndex: 0,
      rect: { x, y: 700, width: 12, height: 12 },
      readOnly: false,
      value: '',
      label: null,
      onValue,
    });
    const { get } = setup([], {
      s0: {
        hasAcroForm: true,
        hasXfa: false,
        widgets: [radio('Small', 100), radio('Large', 150)],
      },
    });
    expect(get().map(fieldName)).toEqual([
      'Option field: size: Small, empty',
      'Option field: size: Large, empty',
    ]);
  });

  it('counts a dropdown on its blank " " option as empty', () => {
    // The I-9's State lists start on a single-space option.
    const { get } = setup([], {
      s0: {
        hasAcroForm: true,
        hasXfa: false,
        widgets: [
          {
            fieldName: 'State',
            kind: 'dropdown',
            pageIndex: 0,
            rect: { x: 210, y: 700, width: 60, height: 20 },
            readOnly: false,
            value: [' '],
            label: null,
            options: [' ', 'AK', 'AL'],
          },
        ],
      },
    });
    expect(get()[0]).toMatchObject({ filled: false });
  });

  it("names an unlabelled widget from the page's printed label", () => {
    // IRS forms: no /TU, field names like topmostSubform[0].Page1[0].f1_01[0].
    const raw = 'topmostSubform[0].Page1[0].f1_01[0]';
    const widget = (fieldName: string, y: number, label: string | null) => ({
      fieldName,
      kind: 'text' as const,
      pageIndex: 0,
      rect: { x: 210, y, width: 300, height: 20 },
      readOnly: false,
      value: '',
      label,
    });
    const { get } = setup(
      [
        detected('Your first name and middle initial', 700),
        detected('Printed label', 600),
      ],
      {
        s0: {
          hasAcroForm: true,
          hasXfa: false,
          widgets: [widget(raw, 700, null), widget('f2', 600, 'Own tooltip')],
        },
      },
    );
    const widgets = get().filter((f) => f.origin === 'widget');
    expect(widgets.map((f) => f.label)).toEqual([
      'Your first name and middle initial',
      'Own tooltip',
    ]);
    // The field keeps its real name for writing.
    expect(widgets[0].widget?.fieldName).toBe(raw);
  });

  it('skips borrowed labels that are sentence fragments', () => {
    // W-9: the end of an instruction above line 1, and a phrase cut mid-way.
    const widget = (fieldName: string, y: number) => ({
      fieldName,
      kind: 'text' as const,
      pageIndex: 0,
      rect: { x: 210, y, width: 300, height: 20 },
      readOnly: false,
      value: '',
      label: null,
    });
    const { get } = setup(
      [
        detected('entity’s name on line 2.)', 700),
        detected('What Name and', 600),
        detected('Postcode', 500),
      ],
      {
        s0: {
          hasAcroForm: true,
          hasXfa: false,
          widgets: [widget('f1', 700), widget('f2', 600), widget('f3', 500)],
        },
      },
    );
    expect(
      get()
        .filter((f) => f.origin === 'widget')
        .map((f) => f.label),
    ).toEqual(['f1', 'f2', 'Postcode']);
  });

  it('does not name a checkbox from a bigger detection around it, or a text one', () => {
    // W-9 line 3a: a small checkbox inside a detected row labelled for the
    // next box along ("C corporation").
    const box = { x: 220, y: 700, width: 8, height: 8 };
    const { get } = setup(
      [
        detected('C corporation', 696, {
          rect: { x: 210, y: 696, width: 300, height: 16 },
        }),
        detected('Some text', 700, { rect: { ...box }, type: 'text' }),
        detected('Individual/sole proprietor', 700, {
          rect: { ...box },
          type: 'tick',
        }),
      ],
      {
        s0: {
          hasAcroForm: true,
          hasXfa: false,
          widgets: [
            {
              fieldName: 'c1_1[0]',
              kind: 'checkbox',
              pageIndex: 0,
              rect: box,
              readOnly: false,
              value: false,
              label: null,
            },
          ],
        },
      },
    );
    expect(get().find((f) => f.origin === 'widget')?.label).toBe(
      'Individual/sole proprietor',
    );
  });
});

describe('signature fields', () => {
  it('count as filled once a signature is placed inside them', () => {
    const { model, get } = setup([
      detected('Signature', 300, { type: 'signature', label: 'Signature' }),
    ]);
    expect(get()[0]).toMatchObject({ filled: false });
    model.dispatch({
      type: 'sign.place',
      params: {
        id: 's',
        pageId: 'ckpt0:0',
        rect: { x: 260, y: 302, width: 100, height: 16 },
        rotate: 0,
        role: 'signature',
        content: { kind: 'image', assetId: 'a', mime: 'image/png' },
      },
    });
    expect(get()[0]).toMatchObject({ filled: true });
  });

  it('treats a text widget named Signature as a signature field', () => {
    const rect = { x: 79, y: 306, width: 215, height: 25 };
    const { model, get } = setup([], {
      s0: {
        hasAcroForm: true,
        hasXfa: false,
        widgets: [
          {
            fieldName: 'Signature',
            kind: 'text',
            pageIndex: 0,
            rect,
            readOnly: false,
            value: '',
            label: null,
          },
          {
            fieldName: 'Name declaration',
            kind: 'text',
            pageIndex: 0,
            rect: { ...rect, y: 271 },
            readOnly: false,
            value: '',
            label: null,
          },
        ],
      },
    });
    expect(get().map((f) => [f.label, f.type, f.filled])).toEqual([
      ['Signature', 'signature', false],
      ['Name declaration', 'text', false],
    ]);
    model.dispatch({
      type: 'sign.place',
      params: {
        id: 's',
        pageId: 'ckpt0:0',
        rect: { x: 100, y: 308, width: 120, height: 20 },
        rotate: 0,
        role: 'signature',
        content: { kind: 'image', assetId: 'a', mime: 'image/png' },
      },
    });
    expect(get()[0]).toMatchObject({ type: 'signature', filled: true });
  });

  it('lays out a detected character-box field as comb text until restyled', () => {
    const { model, get } = setup([detected('Surname', 700, { cellCount: 12 })]);
    const [f] = get();
    expect(f.style).toEqual({ comb: 12 });
    model.dispatch({
      type: 'flat.fill',
      params: {
        id: 'x',
        pageId: 'ckpt0:0',
        rect: f.rect,
        kind: 'text',
        value: 'DOE',
        fieldId: f.key,
        comb: 12,
      },
    });
    expect(get()[0].style).toEqual({ comb: 12 });
    // Character boxes turned off: the fill's own settings win.
    model.dispatch({
      type: 'flat.fill',
      params: {
        id: 'y',
        pageId: 'ckpt0:0',
        rect: f.rect,
        kind: 'text',
        value: 'DOE',
        fieldId: f.key,
        restyle: true,
      },
    });
    expect(get()[0].style).toEqual({});
  });
});

describe('shownFields', () => {
  const f = (origin: ViewField['origin']) => ({ origin }) as ViewField;
  const widget = f('widget');
  const guess = f('detected');
  const free = f('free');

  it('hides detected guesses by default when the document has real form fields', () => {
    expect(shownFields([widget, guess, free], null)).toEqual([widget, free]);
  });

  it('shows detected fields by default on a flat form', () => {
    expect(shownFields([guess, free], null)).toEqual([guess, free]);
  });

  it('follows the Detect fields toggle once it is used', () => {
    expect(shownFields([widget, guess], true)).toEqual([widget, guess]);
    expect(shownFields([guess, free], false)).toEqual([free]);
  });
});
