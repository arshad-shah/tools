import { beforeAll, describe, expect, it } from 'vitest';
import { makeModel } from '../test-helpers';
import { registerCoreOperations } from '.';
import { summarizeChanges } from '../summary';

beforeAll(() => registerCoreOperations());

const RECT = { x: 100, y: 600, width: 200, height: 20 };
const FIELD = {
  id: '0:cell:100:600',
  pageIndex: 0,
  rect: RECT,
  type: 'text' as const,
  label: 'Surname',
  autofill: 'surname' as const,
  confidence: 0.9,
  status: 'suggested' as const,
  source: 'cell' as const,
};

describe('fill-sign ops', () => {
  it('flat.fill adds an overlay on its page with a plain label', () => {
    const m = makeModel();
    const [op] = m.dispatch({
      type: 'flat.fill',
      params: {
        id: 'f1',
        pageId: 'ckpt0:1',
        rect: RECT,
        kind: 'text',
        value: 'Doe',
        label: 'Surname',
      },
    });
    expect(op.label).toBe('Fill Surname on page 2');
    expect(
      m
        .getView()
        .overlays.get('ckpt0:1')
        ?.map((o) => o.opId),
    ).toEqual([op.id]);
  });

  it('labels ticks, crosses, dates and clears', () => {
    const m = makeModel();
    const fill = (kind: string, value: string) =>
      m.dispatch({
        type: 'flat.fill',
        params: { id: 'x', pageId: 'ckpt0:0', rect: RECT, kind, value },
      })[0].label;
    expect(fill('tick', 'yes')).toBe('Tick on page 1');
    expect(fill('cross', 'yes')).toBe('Cross on page 1');
    expect(fill('date', '01/02/2026')).toBe('Fill date on page 1');
    expect(fill('text', 'a')).toBe('Fill text on page 1');
    expect(fill('text', '')).toBe('Clear field on page 1');
  });

  it('a later fill of the same field supersedes the earlier one', () => {
    const m = makeModel();
    const params = (value: string) => ({
      id: 'f',
      pageId: 'ckpt0:0',
      rect: RECT,
      kind: 'text',
      value,
      fieldId: 'k1',
    });
    const [a] = m.dispatch({ type: 'flat.fill', params: params('Do') });
    const [b] = m.dispatch({ type: 'flat.fill', params: params('Doe') });
    const view = m.getView();
    expect(view.hidden.has(a.id)).toBe(true);
    expect(view.hidden.has(b.id)).toBe(false);
    expect(summarizeChanges(m.getState(), view)).toEqual([
      { mode: 'fill-sign', lines: ['1 field filled'] },
    ]);
  });

  it('object.move updates the target rect; object.remove hides it', () => {
    const m = makeModel();
    const [sig] = m.dispatch({
      type: 'sign.place',
      params: {
        id: 's1',
        pageId: 'ckpt0:0',
        rect: RECT,
        rotate: 0,
        role: 'signature',
        content: { kind: 'image', assetId: 'a1', mime: 'image/png' },
      },
    });
    expect(sig.label).toBe('Place signature on page 1');
    const moved = { ...RECT, x: 10 };
    m.dispatch({
      type: 'object.move',
      params: { targetId: sig.id, rect: moved },
    });
    const item = m.getView().overlays.get('ckpt0:0')![0];
    expect((item.params as { rect: unknown }).rect).toEqual(moved);
    m.dispatch({ type: 'object.remove', params: { targetId: sig.id } });
    expect(m.getView().hidden.has(sig.id)).toBe(true);
  });

  it('form.setValue keeps one value per field name', () => {
    const m = makeModel();
    const [a] = m.dispatch({
      type: 'form.setValue',
      params: { name: 'name', value: 'A', label: 'Full name' },
    });
    m.dispatch({ type: 'form.setValue', params: { name: 'name', value: 'B' } });
    expect(a.label).toBe('Fill Full name');
    expect(m.getView().hidden.has(a.id)).toBe(true);
    expect(m.getView().docOverlays).toHaveLength(2);
  });

  it('detect.correct records corrections in the view without output', () => {
    const m = makeModel();
    const labels = [
      m.dispatch({
        type: 'detect.correct',
        params: { action: 'dismiss', fieldIds: ['s0:a'] },
      }),
      m.dispatch({
        type: 'detect.correct',
        params: { action: 'accept', fieldIds: ['s0:a'] },
      }),
      m.dispatch({
        type: 'detect.correct',
        params: {
          action: 'add',
          fieldIds: [],
          field: FIELD,
          pageId: 'ckpt0:2',
        },
      }),
      m.dispatch({
        type: 'detect.correct',
        params: { action: 'retype', fieldIds: ['s0:a'], type: 'date' },
      }),
    ].map(([o]) => o.label);
    expect(labels).toEqual([
      'Dismiss detected field',
      'Accept suggested field',
      'Add field on page 3',
      'Change field type',
    ]);
    expect(m.getView().docOverlays).toHaveLength(4);
    expect(summarizeChanges(m.getState(), m.getView())).toEqual([]);
  });

  it('refuses incomplete corrections and bad signatures', () => {
    const m = makeModel();
    expect(() =>
      m.dispatch({
        type: 'detect.correct',
        params: { action: 'resize', fieldIds: ['a'] },
      }),
    ).toThrow(/missing details/);
    expect(() =>
      m.dispatch({
        type: 'sign.place',
        params: {
          id: 's',
          pageId: 'ckpt0:0',
          rect: RECT,
          rotate: 0,
          role: 'signature',
          content: {
            kind: 'text',
            text: '  ',
            fontId: 'caveat',
            fontAsset: 'f',
            color: '#000000',
          },
        },
      }),
    ).toThrow('Type your name');
  });

  it('summarises signatures and initials', () => {
    const m = makeModel();
    for (const role of ['signature', 'signature', 'initials'])
      m.dispatch({
        type: 'sign.place',
        params: {
          id: role,
          pageId: 'ckpt0:0',
          rect: RECT,
          rotate: 0,
          role,
          content: { kind: 'image', assetId: 'a', mime: 'image/png' },
        },
      });
    expect(summarizeChanges(m.getState(), m.getView())).toEqual([
      { mode: 'fill-sign', lines: ['2 signatures and 1 initials'] },
    ]);
  });
});
