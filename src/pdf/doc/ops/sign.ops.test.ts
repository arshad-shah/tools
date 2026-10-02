import { beforeAll, describe, expect, it } from 'vitest';
import { makeModel } from '../test-helpers';
import { getOperation } from '../registry';
import { summarizeChanges } from '../summary';
import { registerCoreOperations } from '.';
import { MAX_TEXT } from './sign-params';

beforeAll(() => registerCoreOperations());

const RECT = { x: 100, y: 600, width: 200, height: 60 };
const VECTOR = { d: 'M0 0C1 1 2 2 3 3Z', width: 30, height: 10 };
const INK = { kind: 'ink', vector: VECTOR, color: '#1d4ed8' };
const TEXT = {
  kind: 'text',
  text: 'Ada Lovelace',
  fontId: 'kristi',
  fontAsset: 'f1',
  color: '#111827',
};
const place = (content: object) => ({
  type: 'sign.place',
  params: {
    id: 's',
    pageId: 'ckpt0:0',
    rect: RECT,
    rotate: 0,
    role: 'signature',
    content,
  },
});
const BLOCK = {
  signature: INK,
  name: 'Ada Lovelace',
  title: 'Analyst',
  dateIso: '2026-10-01',
  locale: 'en-GB',
  showDate: true,
};

describe('signature content', () => {
  it('accepts ink and traced vectors, which need no assets', () => {
    const m = makeModel();
    const [a] = m.dispatch(place(INK));
    const [b] = m.dispatch(place({ ...INK, kind: 'trace' }));
    const def = getOperation('sign.place');
    expect(def.assets!(a.params)).toEqual([]);
    expect(def.assets!(b.params)).toEqual([]);
    expect(def.assets!({ ...(a.params as object), content: TEXT })).toEqual([
      'f1',
    ]);
  });

  it('refuses bad vectors', () => {
    const m = makeModel();
    const bad =
      (vector: object, color = '#111827') =>
      () =>
        m.dispatch(place({ kind: 'ink', vector, color }));
    expect(bad({ ...VECTOR, d: '' })).toThrow(/empty or too detailed/);
    expect(bad({ ...VECTOR, d: 'M0 0'.repeat(60_000) })).toThrow(
      /too detailed/,
    );
    expect(bad({ ...VECTOR, width: 0 })).toThrow(/no size/);
    expect(bad({ ...VECTOR, height: Infinity })).toThrow(/no size/);
    expect(bad(VECTOR, 'blue')).toThrow(/ink colour/);
  });

  it('typed text takes any of the ten fonts, a slant and a size', () => {
    const m = makeModel();
    const [op] = m.dispatch(place({ ...TEXT, slant: 15, size: 24 }));
    expect((op.params as { content: object }).content).toMatchObject({
      fontId: 'kristi',
      slant: 15,
      size: 24,
    });
    expect(() => m.dispatch(place({ ...TEXT, slant: 30 }))).toThrow(/slant/);
    expect(() => m.dispatch(place({ ...TEXT, size: 'huge' }))).toThrow(/size/);
    expect(() => m.dispatch(place({ ...TEXT, fontId: 'comic' }))).toThrow(
      /unknown value/,
    );
  });

  it('caps typed text, also when an autosave is restored', () => {
    const m = makeModel();
    const long = 'x'.repeat(MAX_TEXT + 1);
    expect(() => m.dispatch(place({ ...TEXT, text: long }))).toThrow(
      /at most 100 characters/,
    );
    expect(() =>
      getOperation('sign.place').validate(
        place({ ...TEXT, text: long }).params,
      ),
    ).toThrow(/at most 100 characters/);
    expect(() =>
      m.dispatch(place({ ...TEXT, text: 'x'.repeat(MAX_TEXT) })),
    ).not.toThrow();
  });
});

describe('sign.block', () => {
  it('places a block on a page with a plain label and summary', () => {
    const m = makeModel();
    const [op] = m.dispatch({
      type: 'sign.block',
      params: {
        id: 'b1',
        pageId: 'ckpt0:1',
        rect: RECT,
        rotate: 0,
        content: BLOCK,
      },
    });
    expect(op.label).toBe('Place signature block on page 2');
    expect(
      m
        .getView()
        .overlays.get('ckpt0:1')
        ?.map((o) => o.opId),
    ).toEqual([op.id]);
    expect(getOperation('sign.block').assets!(op.params)).toEqual([]);
    expect(summarizeChanges(m.getState(), m.getView())).toEqual([
      { mode: 'fill-sign', lines: ['1 signature block'] },
    ]);
  });

  it('can be moved and removed like a placed signature', () => {
    const m = makeModel();
    const [op] = m.dispatch({
      type: 'sign.block',
      params: { id: 'b', pageId: 'ckpt0:0', rect: RECT, content: BLOCK },
    });
    const moved = { ...RECT, x: 20 };
    m.dispatch({
      type: 'object.move',
      params: { targetId: op.id, rect: moved },
    });
    expect(
      (m.getView().overlays.get('ckpt0:0')![0].params as { rect: unknown })
        .rect,
    ).toEqual(moved);
    m.dispatch({ type: 'object.remove', params: { targetId: op.id } });
    expect(m.getView().hidden.has(op.id)).toBe(true);
  });

  it('refuses a bad date or locale', () => {
    const m = makeModel();
    const block = (content: object) => () =>
      m.dispatch({
        type: 'sign.block',
        params: { id: 'b', pageId: 'ckpt0:0', rect: RECT, content },
      });
    expect(block({ ...BLOCK, dateIso: '1 Oct' })).toThrow(/date/);
    expect(block({ ...BLOCK, locale: 'not a locale!' })).toThrow(/format/);
  });
});

describe('sign.initialPages', () => {
  const params = (
    pageIds: string[],
    anchor = { fx: 0.8, fy: 0.05, fw: 0.1, fh: 0.05 },
  ) => ({
    type: 'sign.initialPages',
    params: { id: 'i', pageIds, anchor, content: INK },
  });

  it('labels and summarises the pages it initials', () => {
    const m = makeModel();
    const [op] = m.dispatch(params(['ckpt0:0', 'ckpt0:1', 'ckpt0:2']));
    expect(op.label).toBe('Initial 3 pages');
    expect(m.getView().docOverlays.map((o) => o.opId)).toEqual([op.id]);
    expect(summarizeChanges(m.getState(), m.getView())).toEqual([
      { mode: 'fill-sign', lines: ['Initials on 3 pages'] },
    ]);
    m.dispatch({ type: 'object.remove', params: { targetId: op.id } });
    expect(m.getView().hidden.has(op.id)).toBe(true);
  });

  it('refuses unknown pages and spots off the page', () => {
    const m = makeModel();
    expect(() => m.dispatch(params(['nope']))).toThrow(/no longer exists/);
    expect(() =>
      m.dispatch(params(['ckpt0:0'], { fx: 0.95, fy: 0, fw: 0.1, fh: 0.1 })),
    ).toThrow(/on the page/);
    expect(() => m.dispatch(params([]))).toThrow(/page ids/);
  });
});
