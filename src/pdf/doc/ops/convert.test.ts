import { describe, expect, it } from 'vitest';
import { makeModel, makeSource } from '../test-helpers';
import { getOperation } from '../registry';
import { registerCoreOperations } from '.';
import { insertImagePages } from './convert';

registerCoreOperations();

const insert = (params: Record<string, unknown>) => ({
  type: 'page.insertImages',
  params,
});

describe('page.insertImages', () => {
  it('is a registered structure op of the convert mode', () => {
    const def = getOperation('page.insertImages');
    expect(def).toBe(insertImagePages);
    expect(def.kind).toBe('structure');
    expect(def.mode).toBe('convert');
  });

  it('validates its settings', () => {
    const v = (p: unknown) => insertImagePages.validate(p);
    expect(v({ at: 1, sourceId: 'img', newIds: ['a', 'b'] })).toEqual({
      at: 1,
      sourceId: 'img',
      newIds: ['a', 'b'],
    });
    expect(() => v(null)).toThrow('expected settings');
    expect(() => v({ at: -1, sourceId: 'img', newIds: ['a'] })).toThrow(
      'expected a whole number',
    );
    expect(() => v({ at: 0, sourceId: '', newIds: ['a'] })).toThrow(
      'expected an id',
    );
    expect(() => v({ at: 0, sourceId: 'img', newIds: [] })).toThrow(
      'expected page ids',
    );
    expect(() => v({ at: 0, sourceId: 'img', newIds: ['a', 'a'] })).toThrow(
      'expected page ids',
    );
  });

  it('inserts the image pages after the given position, one undo step', () => {
    const model = makeModel();
    model.addSource(makeSource('img', 2, 'merged'));
    const [op] = model.dispatch(
      insert({ at: 1, sourceId: 'img', newIds: ['n1', 'n2'] }),
    );
    expect(op.label).toBe('Insert 2 images as pages at position 2');
    const pages = model.getView().pages;
    expect(pages.map((p) => p.id)).toEqual([
      'ckpt0:0',
      'n1',
      'n2',
      'ckpt0:1',
      'ckpt0:2',
    ]);
    expect(pages[1]).toMatchObject({ source: 'img', index: 0, rotate: 0 });
    expect(pages[2]).toMatchObject({ source: 'img', index: 1 });
    model.undo();
    expect(model.getView().pages).toHaveLength(3);
  });

  it('clamps the position to the end and labels one image', () => {
    const model = makeModel();
    model.addSource(makeSource('img', 1, 'merged'));
    const [op] = model.dispatch(
      insert({ at: 99, sourceId: 'img', newIds: ['n1'] }),
    );
    expect(op.label).toBe('Insert 1 image as a page at position 100');
    expect(model.getView().pages.at(-1)?.id).toBe('n1');
  });

  it('refuses page ids already in use', () => {
    const model = makeModel();
    expect(() =>
      model.dispatch(insert({ at: 0, sourceId: 'img', newIds: ['ckpt0:1'] })),
    ).toThrow('A new page id is already in use');
  });

  it('summarises inserted images for the export summary', () => {
    expect(
      insertImagePages.summarize?.([
        { at: 0, sourceId: 'a', newIds: ['x', 'y'] },
        { at: 0, sourceId: 'b', newIds: ['z'] },
      ]),
    ).toBe('3 images inserted as pages');
  });

  it('drops the image source when a new edit replaces the undone insert', () => {
    const model = makeModel();
    model.addSource(makeSource('img', 1, 'merged'));
    model.dispatch(insert({ at: 0, sourceId: 'img', newIds: ['n1'] }));
    model.undo();
    model.dispatch({
      type: 'page.rotate',
      params: { pageIds: ['ckpt0:0'], delta: 90 },
    });
    expect(model.getState().sources.img).toBeUndefined();
  });
});
