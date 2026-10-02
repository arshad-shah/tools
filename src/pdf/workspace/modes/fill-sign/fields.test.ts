import { beforeAll, describe, expect, it } from 'vitest';
import type { DetectedField } from '@/pdf/detect';
import { mergeDetection } from '@/pdf/doc/detection';
import { registerCoreOperations } from '@/pdf/doc/ops';
import { makeModel } from '@/pdf/doc/test-helpers';
import type { FormInfo } from '@/pdf/render/form-info';
import { detectedKey, fieldName, viewFields } from './fields';

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
