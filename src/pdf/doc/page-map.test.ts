import { beforeAll, describe, expect, it } from 'vitest';
import { findBanned } from '../../../eslint-rules/banned-glyphs.js';
import { registerCoreOperations } from './ops';
import { baseView, effectiveRotation, pageNumberOf } from './page-map';
import { getOperation, type LabelContext } from './registry';
import type {
  CheckpointMeta,
  DocView,
  NewOperation,
  Operation,
  SourceRef,
} from './types';
import { foldView } from './view';

const source = (pages = 3, id = 's0'): SourceRef => ({
  id,
  name: 'a.pdf',
  byteSize: 10,
  pageCount: pages,
  pages: Array.from({ length: pages }, (_, i) => ({
    view: [0, 0, 612, 792] as [number, number, number, number],
    rotate: (i === 1 ? 90 : 0) as 0 | 90,
  })),
  origin: 'checkpoint',
});
const ckpt: CheckpointMeta = {
  id: 'c',
  index: 0,
  sourceId: 's0',
  opId: null,
  byteSize: 10,
  pageCount: 3,
  createdAt: 0,
  available: true,
};
const base = (pages = 3) =>
  baseView({ ...ckpt, pageCount: pages }, source(pages));

let n = 0;
/** Validates, labels against the current view, then folds. */
function apply(view: DocView, input: NewOperation): [DocView, Operation] {
  const def = getOperation(input.type);
  const params = def.validate(input.params);
  const ctx: LabelContext = {
    pageNumber: (id) => pageNumberOf(view, id),
    pageCount: view.pages.length,
    pageOf: () => null,
  };
  const op: Operation = {
    id: `op${n++}`,
    type: def.type,
    v: def.v,
    params,
    at: 0,
    label: def.label(params, ctx),
  };
  return [foldView(view, [op]), op];
}
const ids = (v: DocView) => v.pages.map((p) => p.id);

beforeAll(() => registerCoreOperations());

describe('baseView', () => {
  it('gives every page an id of checkpoint:index', () => {
    const v = base();
    expect(ids(v)).toEqual(['c:0', 'c:1', 'c:2']);
    expect(v.pages[1]).toMatchObject({ source: 's0', index: 1, rotate: 0 });
    expect(pageNumberOf(v, 'c:2')).toBe(3);
    expect(pageNumberOf(v, 'zz')).toBeNull();
    expect(effectiveRotation(v.pages[1], source())).toBe(90);
  });
});

describe('organize ops', () => {
  it('reorder moves page 3 to position 1', () => {
    const [v, op] = apply(base(), {
      type: 'page.reorder',
      params: { pageIds: ['c:2'], to: 0 },
    });
    expect(ids(v)).toEqual(['c:2', 'c:0', 'c:1']);
    expect(op.label).toBe('Move page 3 to position 1');
  });

  it('reorder keeps the relative order of several pages', () => {
    const [v, op] = apply(base(5), {
      type: 'page.reorder',
      params: { pageIds: ['c:4', 'c:1'], to: 0 },
    });
    expect(ids(v)).toEqual(['c:1', 'c:4', 'c:0', 'c:2', 'c:3']);
    expect(op.label).toBe('Move 2 pages to position 1');
  });

  it('rotate labels', () => {
    let [v, op] = apply(base(), {
      type: 'page.rotate',
      params: { pageIds: ['c:0'], delta: 90 },
    });
    expect(v.pages[0].rotate).toBe(90);
    expect(op.label).toBe('Rotate page 1 clockwise');
    [v, op] = apply(v, {
      type: 'page.rotate',
      params: { pageIds: ['c:0'], delta: -90 },
    });
    expect(v.pages[0].rotate).toBe(0);
    expect(op.label).toBe('Rotate page 1 anticlockwise');
    // Rotation wraps around (moved from the old Organize tool's tests).
    const [wrapped] = apply(v, {
      type: 'page.rotate',
      params: { pageIds: ['c:0'], delta: -90 },
    });
    expect(wrapped.pages[0].rotate).toBe(270);
    [, op] = apply(v, {
      type: 'page.rotate',
      params: { pageIds: ['c:0'], delta: 180 },
    });
    expect(op.label).toBe('Rotate page 1 by 180 degrees');
    [, op] = apply(v, {
      type: 'page.rotate',
      params: { pageIds: ['c:0', 'c:1', 'c:2'], delta: 90 },
    });
    expect(op.label).toBe('Rotate 3 pages clockwise');
    expect(() =>
      getOperation('page.rotate').validate({ pageIds: ['c:0'], delta: 45 }),
    ).toThrow(expect.objectContaining({ code: 'INVALID_INPUT' }));
  });

  it('delete removes pages; deleting all is refused by applyToView', () => {
    const [v, op] = apply(base(), {
      type: 'page.delete',
      params: { pageIds: ['c:1'] },
    });
    expect(ids(v)).toEqual(['c:0', 'c:2']);
    expect(op.label).toBe('Delete page 2');
    const all = { pageIds: ['c:0', 'c:1', 'c:2'] };
    expect(getOperation('page.delete').validate(all)).toEqual(all);
    expect(() => apply(base(), { type: 'page.delete', params: all })).toThrow(
      expect.objectContaining({
        code: 'INVALID_INPUT',
        message: 'The document must keep at least one page',
      }),
    );
  });

  it('duplicate inserts the copy after its original', () => {
    const [v, op] = apply(base(), {
      type: 'page.duplicate',
      params: { pageIds: ['c:1'], newIds: ['n1'] },
    });
    expect(ids(v)).toEqual(['c:0', 'c:1', 'n1', 'c:2']);
    expect(v.pages[2]).toMatchObject({ source: 's0', index: 1, rotate: 0 });
    expect(op.label).toBe('Duplicate page 2');
  });

  it('insertBlank adds a blank page at the position', () => {
    const [v, op] = apply(base(), {
      type: 'page.insertBlank',
      params: { at: 1, newId: 'b1', width: 612, height: 792 },
    });
    expect(ids(v)).toEqual(['c:0', 'b1', 'c:1', 'c:2']);
    expect(v.pages[1].blank).toEqual({ width: 612, height: 792 });
    expect(op.label).toBe('Insert a blank page at position 2');
  });

  it('crop and resize set pending boxes', () => {
    const box = { x: 10, y: 20, width: 300, height: 400 };
    let [v, op] = apply(base(), {
      type: 'page.crop',
      params: { pageIds: ['c:0'], box },
    });
    expect(v.pages[0].crop).toEqual(box);
    expect(op.label).toBe('Crop page 1');
    [v, op] = apply(v, {
      type: 'page.resize',
      params: { pageIds: ['c:0', 'c:2'], width: 595, height: 842 },
    });
    expect(v.pages[2].size).toEqual({ width: 595, height: 842 });
    expect(op.label).toBe('Change the size of 2 pages');
    expect(() =>
      getOperation('page.crop').validate({
        pageIds: ['c:0'],
        box: { x: 0, y: 0, width: 0, height: 5 },
      }),
    ).toThrow(expect.objectContaining({ code: 'INVALID_INPUT' }));
  });

  it('label sets page labels', () => {
    const ranges = [
      { start: 0, style: 'r' },
      { start: 2, style: 'D', first: 1 },
    ];
    const [v, op] = apply(base(), { type: 'page.label', params: { ranges } });
    expect(v.pageLabels).toEqual(ranges);
    expect(op.label).toBe('Set page labels');
    expect(() =>
      getOperation('page.label').validate({
        ranges: [{ start: 1, style: 'D' }],
      }),
    ).toThrow('The first page label range must start on page 1');
    expect(() =>
      apply(base(), {
        type: 'page.label',
        params: {
          ranges: [
            { start: 0, style: 'D' },
            { start: 3, style: 'r' },
          ],
        },
      }),
    ).toThrow(expect.objectContaining({ code: 'INVALID_INPUT' }));
  });

  it('page labels follow their pages through structure ops', () => {
    const labelled = (pages = 3) =>
      apply(base(pages), {
        type: 'page.label',
        params: {
          ranges: [
            { start: 0, style: 'r' },
            { start: 2, style: 'D', prefix: 'P-' },
          ],
        },
      })[0];
    // i, ii, P-1, P-2, P-3 on five pages.
    let [v] = apply(labelled(5), {
      type: 'page.delete',
      params: { pageIds: ['c:3', 'c:4'] },
    });
    expect(v.pageLabels).toEqual([
      { start: 0, style: 'r' },
      { start: 2, style: 'D', prefix: 'P-' },
    ]);
    [v] = apply(labelled(), {
      type: 'page.delete',
      params: { pageIds: ['c:0', 'c:1'] },
    });
    expect(v.pageLabels).toEqual([{ start: 0, style: 'D', prefix: 'P-' }]);
    [v] = apply(labelled(), {
      type: 'page.delete',
      params: { pageIds: ['c:0'] },
    });
    expect(v.pageLabels).toEqual([
      { start: 0, style: 'r', first: 2 },
      { start: 1, style: 'D', prefix: 'P-' },
    ]);
    [v] = apply(labelled(), {
      type: 'page.reorder',
      params: { pageIds: ['c:2'], to: 0 },
    });
    expect(v.pageLabels).toEqual([
      { start: 0, style: 'D', prefix: 'P-' },
      { start: 1, style: 'r' },
    ]);
    [v] = apply(labelled(), {
      type: 'page.duplicate',
      params: { pageIds: ['c:0'], newIds: ['n0'] },
    });
    expect(v.pageLabels).toEqual([
      { start: 0, style: 'r' },
      { start: 1, style: 'r' },
      { start: 3, style: 'D', prefix: 'P-' },
    ]);
    [v] = apply(labelled(), {
      type: 'page.insertBlank',
      params: { at: 3, newId: 'b1', width: 612, height: 792 },
    });
    expect(v.pageLabels).toEqual([
      { start: 0, style: 'r' },
      { start: 2, style: 'D', prefix: 'P-' },
    ]);
    [v] = apply(labelled(), {
      type: 'page.mergeIn',
      params: { sourceId: 's2', at: 1, newIds: ['m0', 'm1'] },
    });
    expect(v.pageLabels).toEqual([
      { start: 0, style: 'r' },
      { start: 3, style: 'r', first: 2 },
      { start: 4, style: 'D', prefix: 'P-' },
    ]);
    const before = labelled();
    const [rotated] = apply(before, {
      type: 'page.rotate',
      params: { pageIds: ['c:0'], delta: 90 },
    });
    expect(rotated.pageLabels).toBe(before.pageLabels);
  });

  it('mergeIn appends pages of another source', () => {
    const [v, op] = apply(base(), {
      type: 'page.mergeIn',
      params: { sourceId: 's2', at: 3, newIds: ['m0', 'm1'] },
    });
    expect(ids(v)).toEqual(['c:0', 'c:1', 'c:2', 'm0', 'm1']);
    expect(v.pages[4]).toMatchObject({ source: 's2', index: 1, rotate: 0 });
    expect(op.label).toBe('Insert 2 pages from another file at position 4');
  });

  it('an unknown page id is INVALID_INPUT', () => {
    for (const input of [
      { type: 'page.reorder', params: { pageIds: ['x'], to: 0 } },
      { type: 'page.rotate', params: { pageIds: ['x'], delta: 90 } },
      { type: 'page.delete', params: { pageIds: ['x'] } },
      { type: 'page.duplicate', params: { pageIds: ['x'], newIds: ['y'] } },
      {
        type: 'page.crop',
        params: { pageIds: ['x'], box: { x: 0, y: 0, width: 1, height: 1 } },
      },
      {
        type: 'page.resize',
        params: { pageIds: ['x'], width: 10, height: 10 },
      },
    ])
      expect(() => apply(base(), input)).toThrow(
        expect.objectContaining({
          code: 'INVALID_INPUT',
          message: 'Page no longer exists',
        }),
      );
  });

  it('labels and summaries carry no glyphs', () => {
    const [, op] = apply(base(), {
      type: 'page.rotate',
      params: { pageIds: ['c:0'], delta: 90 },
    });
    expect(findBanned(op.label)).toBeNull();
  });
});

describe('object ops', () => {
  const withObject = (): DocView => {
    const v = base();
    const item = {
      opId: 'obj1',
      type: 'test.object',
      pageId: 'c:1',
      params: { rect: { x: 0, y: 0, width: 10, height: 10 }, text: 'Hi' },
    };
    return { ...v, overlays: new Map([['c:1', [item]]]) };
  };

  it('object.move rewrites the target rect', () => {
    const view = withObject();
    const def = getOperation('object.move');
    const p = def.validate({
      targetId: 'obj1',
      rect: { x: 5, y: 5, width: 20, height: 10 },
    });
    expect(
      def.label(p, {
        pageNumber: (id) => pageNumberOf(view, id),
        pageCount: 3,
        pageOf: (id) => (id === 'obj1' ? 'c:1' : null),
      }),
    ).toBe('Move object on page 2');
    const v = foldView(view, [
      { id: 'm', type: 'object.move', v: 1, params: p, at: 0, label: '' },
    ]);
    expect(v.overlays.get('c:1')![0].params).toEqual({
      rect: { x: 5, y: 5, width: 20, height: 10 },
      text: 'Hi',
    });
    expect(def.noOutput).toBe(true);
  });

  it('object.remove hides the target', () => {
    const v = foldView(withObject(), [
      {
        id: 'r',
        type: 'object.remove',
        v: 1,
        params: { targetId: 'obj1' },
        at: 0,
        label: '',
      },
    ]);
    expect(v.hidden.has('obj1')).toBe(true);
    expect(() =>
      foldView(base(), [
        {
          id: 'r',
          type: 'object.remove',
          v: 1,
          params: { targetId: 'nope' },
          at: 0,
          label: '',
        },
      ]),
    ).toThrow(expect.objectContaining({ code: 'INVALID_INPUT' }));
  });
});
