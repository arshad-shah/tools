import { beforeAll, describe, expect, it } from 'vitest';
import { DocumentModel, type DocumentState, type HistoryEvent } from './model';
import { registerCoreOperations } from './ops';
import { defineOperation, registerOperations } from './registry';
import type { SourceRef } from './types';

const geom = {
  view: [0, 0, 612, 792] as [number, number, number, number],
  rotate: 0 as const,
};
const source = (id: string, pages: number): SourceRef => ({
  id,
  name: 'a.pdf',
  byteSize: 100,
  pageCount: pages,
  pages: Array.from({ length: pages }, () => geom),
  origin: 'checkpoint',
});

const initial = (): DocumentState => ({
  id: 'doc',
  name: 'a.pdf',
  createdAt: 0,
  sources: { s0: source('s0', 3) },
  checkpoints: [
    {
      id: 'ckpt0',
      index: 0,
      sourceId: 's0',
      opId: null,
      byteSize: 100,
      pageCount: 3,
      createdAt: 0,
      available: true,
    },
  ],
  log: [],
  cursor: 0,
  encryptedInput: false,
  restricted: false,
});

const repair = defineOperation<Record<string, never>>({
  type: 'test.repair',
  v: 1,
  kind: 'checkpoint',
  mode: 'optimize',
  label: () => 'Repair the file',
  validate: () => ({}),
});

let ids = 0;
const model = () => {
  const m = new DocumentModel(initial(), {
    now: () => 1,
    newId: () => `id${ids++}`,
  });
  const events: HistoryEvent[] = [];
  m.subscribe((e) => events.push(e));
  return { m, events };
};
const rotate = (pageId: string, delta = 90) => ({
  type: 'page.rotate',
  params: { pageIds: [pageId], delta },
});
const checkpoint = (m: DocumentModel) =>
  m.commitCheckpoint(
    { type: 'test.repair', params: {} },
    {
      id: 'ckpt1',
      sourceId: 's1',
      byteSize: 90,
      pageCount: 3,
      createdAt: 2,
    },
    source('s1', 3),
  );

beforeAll(() => {
  registerCoreOperations();
  registerOperations([repair]);
});

describe('DocumentModel', () => {
  it('dispatch applies an op and announces its label', () => {
    const { m, events } = model();
    m.dispatch(rotate('ckpt0:0'));
    expect(m.getState().cursor).toBe(1);
    expect(m.getView().pages[0].rotate).toBe(90);
    expect(events.at(-1)).toMatchObject({
      kind: 'dispatch',
      label: 'Rotate page 1 clockwise',
    });
  });

  it('undo and redo move the cursor', () => {
    const { m, events } = model();
    m.dispatch(rotate('ckpt0:0'));
    expect(m.undoLabel()).toBe('Rotate page 1 clockwise');
    m.undo();
    expect(m.getState().cursor).toBe(0);
    expect(m.getView().pages[0].rotate).toBe(0);
    expect(events.at(-1)).toEqual({
      kind: 'undo',
      label: 'Rotate page 1 clockwise',
    });
    expect(m.canUndo()).toBe(false);
    expect(m.redoLabel()).toBe('Rotate page 1 clockwise');
    m.redo();
    expect(m.getView().pages[0].rotate).toBe(90);
    expect(events.at(-1)).toEqual({
      kind: 'redo',
      label: 'Rotate page 1 clockwise',
    });
    expect(m.canRedo()).toBe(false);
    expect(m.undo()).toMatchObject({ kind: 'undo' });
  });

  it('a grouped dispatch is one undo step with one label', () => {
    const { m } = model();
    const ops = m.dispatch(
      [
        rotate('ckpt0:0'),
        { type: 'page.delete', params: { pageIds: ['ckpt0:1'] } },
      ],
      'Tidy pages',
    );
    expect(ops[0].group).toBeDefined();
    expect(ops[1].group).toBe(ops[0].group);
    expect(m.undoLabel()).toBe('Tidy pages');
    m.undo();
    expect(m.getState().cursor).toBe(0);
    expect(m.getView().pages).toHaveLength(3);
    m.redo();
    expect(m.getState().cursor).toBe(2);
  });

  it('dispatch after undo truncates the redo tail', () => {
    const { m } = model();
    m.dispatch(rotate('ckpt0:0'));
    m.dispatch(rotate('ckpt0:1'));
    m.undo();
    m.dispatch(rotate('ckpt0:2'));
    expect(m.getState().log.map((o) => o.params)).toEqual([
      { pageIds: ['ckpt0:0'], delta: 90 },
      { pageIds: ['ckpt0:2'], delta: 90 },
    ]);
    expect(m.canRedo()).toBe(false);
  });

  it('an invalid op throws and changes nothing', () => {
    const { m, events } = model();
    m.dispatch(rotate('ckpt0:0'));
    const before = m.getState();
    expect(() =>
      m.dispatch([
        rotate('ckpt0:1'),
        {
          type: 'page.delete',
          params: { pageIds: ['ckpt0:0', 'ckpt0:1', 'ckpt0:2'] },
        },
      ]),
    ).toThrow(expect.objectContaining({ code: 'INVALID_INPUT' }));
    expect(m.getState()).toBe(before);
    expect(events).toHaveLength(1);
    expect(m.getView().pages[1].rotate).toBe(0);
  });

  it('labels are fixed at dispatch time', () => {
    const { m } = model();
    m.dispatch(rotate('ckpt0:2'));
    m.dispatch({
      type: 'page.reorder',
      params: { pageIds: ['ckpt0:2'], to: 0 },
    });
    expect(m.getState().log[0].label).toBe('Rotate page 3 clockwise');
  });

  it('checkpoints switch the base; undo and redo cross them', () => {
    const { m, events } = model();
    m.dispatch(rotate('ckpt0:0'));
    checkpoint(m);
    expect(m.currentCheckpoint().index).toBe(1);
    expect(m.getView().pages.map((p) => p.id)).toEqual([
      'ckpt1:0',
      'ckpt1:1',
      'ckpt1:2',
    ]);
    expect(m.getView().pages[0].rotate).toBe(0);
    expect(events.at(-1)).toMatchObject({
      kind: 'checkpoint',
      label: 'Repair the file',
    });
    m.undo();
    expect(
      events
        .slice(-2)
        .map((e) => e.kind)
        .sort(),
    ).toEqual(['base-changed', 'undo']);
    expect(events.find((e) => e.kind === 'base-changed')).toMatchObject({
      checkpoint: { id: 'ckpt0' },
    });
    expect(m.currentCheckpoint().id).toBe('ckpt0');
    expect(m.getView().pages[0].rotate).toBe(90);
    m.redo();
    expect(m.currentCheckpoint().id).toBe('ckpt1');
    expect(events.at(-1)).toMatchObject({
      kind: 'base-changed',
      checkpoint: { id: 'ckpt1' },
    });
  });

  it('a new op after undoing a checkpoint drops it and its source', () => {
    const { m, events } = model();
    checkpoint(m);
    m.undo();
    m.dispatch(rotate('ckpt0:0'));
    expect(events.find((e) => e.kind === 'dropped')).toEqual({
      kind: 'dropped',
      checkpoints: [expect.objectContaining({ id: 'ckpt1' })],
      sources: ['s1'],
    });
    expect(m.getState().checkpoints.map((c) => c.id)).toEqual(['ckpt0']);
    expect(m.getState().sources.s1).toBeUndefined();
  });

  it('an unavailable previous checkpoint stops undo there', () => {
    const { m } = model();
    m.dispatch(rotate('ckpt0:0'));
    checkpoint(m);
    m.dispatch(rotate('ckpt1:0'));
    m.markUnavailable(['ckpt0']);
    expect(m.canUndo()).toBe(true);
    m.undo();
    expect(m.canUndo()).toBe(false);
    expect(m.undoLabel()).toBeNull();
    expect(m.undo()).toBeNull();
  });

  it('getView is memoised until a change', () => {
    const { m } = model();
    const a = m.getView();
    expect(m.getView()).toBe(a);
    const v0 = m.getVersion();
    m.dispatch(rotate('ckpt0:0'));
    expect(m.getVersion()).toBeGreaterThan(v0);
    const b = m.getView();
    expect(b).not.toBe(a);
    expect(m.getView()).toBe(b);
  });

  it('rename and merged sources', () => {
    const { m, events } = model();
    m.rename('b.pdf');
    expect(m.getState().name).toBe('b.pdf');
    expect(events.at(-1)).toEqual({ kind: 'renamed', name: 'b.pdf' });
    m.addSource({ ...source('s2', 2), origin: 'merged' });
    m.dispatch({
      type: 'page.mergeIn',
      params: { sourceId: 's2', at: 3, newIds: ['m0', 'm1'] },
    });
    expect(m.getView().pages).toHaveLength(5);
    m.undo();
    m.dispatch(rotate('ckpt0:0'));
    expect(events.find((e) => e.kind === 'dropped')).toMatchObject({
      sources: ['s2'],
    });
  });

  it('unrestrict lifts the read-only flag once', () => {
    const m = new DocumentModel({ ...initial(), restricted: true });
    const seen: HistoryEvent[] = [];
    m.subscribe((e) => seen.push(e));
    m.unrestrict();
    m.unrestrict();
    expect(m.getState().restricted).toBe(false);
    expect(seen).toEqual([{ kind: 'changed' }]);
  });

  it('checkpoint ops are refused by dispatch', () => {
    const { m } = model();
    expect(() => m.dispatch({ type: 'test.repair', params: {} })).toThrow(
      expect.objectContaining({ code: 'INVALID_INPUT' }),
    );
  });

  it('a running job blocks dispatch, undo and redo until it ends', () => {
    const { m, events } = model();
    m.dispatch(rotate('ckpt0:0'));
    m.dispatch(rotate('ckpt0:1'));
    m.undo();
    events.length = 0;
    expect(m.isBusy()).toBe(false);
    const end = m.beginJob();
    expect(m.isBusy()).toBe(true);
    expect(events).toEqual([{ kind: 'busy', busy: true }]);
    expect(() => m.dispatch(rotate('ckpt0:2'))).toThrow(
      expect.objectContaining({ code: 'INVALID_INPUT' }),
    );
    expect(m.canUndo()).toBe(false);
    expect(m.canRedo()).toBe(false);
    expect(m.undo()).toBeNull();
    expect(m.redo()).toBeNull();
    expect(() => m.beginJob()).toThrow(
      expect.objectContaining({ code: 'INVALID_INPUT' }),
    );
    expect(m.getState().cursor).toBe(1);
    end();
    end(); // ending twice is harmless
    expect(m.isBusy()).toBe(false);
    expect(events.slice(1)).toEqual([{ kind: 'busy', busy: false }]);
    expect(m.redo()).not.toBeNull();
  });
});
