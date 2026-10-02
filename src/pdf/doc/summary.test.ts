import { beforeAll, describe, expect, it } from 'vitest';
import { findBanned } from '../../../eslint-rules/banned-glyphs.js';
import { DocumentModel, type DocumentState } from './model';
import { registerCoreOperations } from './ops';
import { defineOperation, registerOperations } from './registry';
import { summarizeChanges } from './summary';
import { withOverlay } from './page-map';

const geom = {
  view: [0, 0, 612, 792] as [number, number, number, number],
  rotate: 0 as const,
};
const state = (): DocumentState => ({
  id: 'd',
  name: 'a.pdf',
  createdAt: 0,
  sources: {
    s0: {
      id: 's0',
      name: 'a.pdf',
      byteSize: 1,
      pageCount: 4,
      pages: [geom, geom, geom, geom],
      origin: 'checkpoint',
    },
  },
  checkpoints: [
    {
      id: 'c',
      index: 0,
      sourceId: 's0',
      opId: null,
      byteSize: 1,
      pageCount: 4,
      createdAt: 0,
      available: true,
    },
  ],
  log: [],
  cursor: 0,
  encryptedInput: false,
  restricted: false,
});

const note = defineOperation<{ pageId: string }>({
  type: 'test.note',
  v: 1,
  kind: 'overlay',
  mode: 'annotate',
  label: () => 'Add a note',
  summarize: (ops) => `${ops.length} notes`,
  validate: (p) => p as { pageId: string },
  applyToView: (view, p, op) =>
    withOverlay(view, {
      opId: op.id,
      type: 'test.note',
      pageId: p.pageId,
      params: p,
    }),
});
const repair = defineOperation<Record<string, never>>({
  type: 'test.fix',
  v: 1,
  kind: 'checkpoint',
  mode: 'optimize',
  label: () => 'Repair',
  validate: () => ({}),
});

beforeAll(() => {
  registerCoreOperations();
  registerOperations([note, repair]);
});

const rotate = (id: string) => ({
  type: 'page.rotate',
  params: { pageIds: [id], delta: 90 },
});

describe('summarizeChanges', () => {
  it('groups lines by mode from the op definitions', () => {
    const m = new DocumentModel(state());
    m.dispatch(rotate('c:0'));
    m.dispatch(rotate('c:1'));
    m.dispatch({ type: 'page.delete', params: { pageIds: ['c:2'] } });
    const out = summarizeChanges(m.getState(), m.getView());
    expect(out).toEqual([
      { mode: 'organize', lines: ['2 pages rotated', '1 page deleted'] },
    ]);
    for (const line of out.flatMap((s) => s.lines))
      expect(findBanned(line)).toBeNull();
  });

  it('skips undone ops, hidden objects and objects on deleted pages', () => {
    const m = new DocumentModel(state());
    const [a] = m.dispatch({ type: 'test.note', params: { pageId: 'c:0' } });
    m.dispatch({ type: 'test.note', params: { pageId: 'c:1' } });
    m.dispatch({ type: 'test.note', params: { pageId: 'c:3' } });
    m.dispatch({ type: 'object.remove', params: { targetId: a.id } });
    m.dispatch({ type: 'page.delete', params: { pageIds: ['c:1'] } });
    m.dispatch(rotate('c:3'));
    m.undo();
    expect(summarizeChanges(m.getState(), m.getView())).toEqual([
      { mode: 'organize', lines: ['1 page deleted'] },
      { mode: 'annotate', lines: ['1 notes'] },
    ]);
  });

  it('skips page changes to pages deleted later', () => {
    const m = new DocumentModel(state());
    m.dispatch(rotate('c:0'));
    m.dispatch({
      type: 'page.duplicate',
      params: { pageIds: ['c:1'], newIds: ['d1'] },
    });
    m.dispatch({ type: 'page.delete', params: { pageIds: ['c:0', 'c:1'] } });
    expect(summarizeChanges(m.getState(), m.getView())).toEqual([
      {
        mode: 'organize',
        lines: ['1 page duplicated', '2 pages deleted'],
      },
    ]);
  });

  it('a reset crop clears the crop and is not a change', () => {
    const m = new DocumentModel(state());
    const box = { x: 10, y: 10, width: 300, height: 300 };
    m.dispatch({ type: 'page.crop', params: { pageIds: ['c:0', 'c:1'], box } });
    m.dispatch({ type: 'page.crop', params: { pageIds: ['c:0'], box: null } });
    expect(m.getView().pages[0]).not.toHaveProperty('crop');
    expect(m.getView().pages[1].crop).toEqual(box);
    expect(m.getState().log.at(-1)?.label).toBe('Reset the crop of page 1');
    expect(summarizeChanges(m.getState(), m.getView())).toEqual([
      { mode: 'organize', lines: ['1 page cropped'] },
    ]);
    m.dispatch({ type: 'page.crop', params: { pageIds: ['c:1'], box: null } });
    expect(summarizeChanges(m.getState(), m.getView())).toEqual([]);
  });

  it('checkpoints contribute their report title; no changes is empty', () => {
    const m = new DocumentModel(state());
    expect(summarizeChanges(m.getState(), m.getView())).toEqual([]);
    m.commitCheckpoint(
      { type: 'test.fix', params: {} },
      {
        id: 'c1',
        sourceId: 's1',
        byteSize: 1,
        pageCount: 1,
        createdAt: 0,
        report: { title: 'File repaired', lines: [], warnings: [] },
      },
      {
        id: 's1',
        name: 'a.pdf',
        byteSize: 1,
        pageCount: 1,
        pages: [geom],
        origin: 'checkpoint',
      },
    );
    expect(summarizeChanges(m.getState(), m.getView())).toEqual([
      { mode: 'optimize', lines: ['File repaired'] },
    ]);
  });
});
