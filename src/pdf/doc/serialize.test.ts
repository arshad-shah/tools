import { beforeAll, describe, expect, it } from 'vitest';
import { registerCoreOperations } from './ops';
import { defineOperation, registerOperations } from './registry';
import { blobKey, fromRecords, SCHEMA, toRecords } from './serialize';
import { makeModel, makeSource, makeState } from './test-helpers';

const fix = defineOperation<Record<string, never>>({
  type: 'test.serialize.fix',
  v: 1,
  kind: 'checkpoint',
  mode: 'optimize',
  label: () => 'Fix',
  validate: (p) => {
    if (typeof p !== 'object' || p === null) throw new Error('bad');
    return {};
  },
});
beforeAll(() => {
  registerCoreOperations();
  registerOperations([fix]);
});

const ui = {
  mode: 'organize' as const,
  viewport: { page: 2, zoom: { kind: 'fit-width' as const } },
};

function edited() {
  const m = makeModel();
  m.dispatch({
    type: 'page.rotate',
    params: { pageIds: ['ckpt0:0'], delta: 90 },
  });
  m.commitCheckpoint(
    { type: 'test.serialize.fix', params: {} },
    { id: 'ckpt1', sourceId: 's1', byteSize: 50, pageCount: 3, createdAt: 5 },
    makeSource('s1', 3),
  );
  m.dispatch({ type: 'page.delete', params: { pageIds: ['ckpt1:2'] } });
  m.undo();
  return m;
}

describe('serialize', () => {
  it('round-trips state through records', () => {
    const m = edited();
    const { doc, log } = toRecords(m.getState(), { ...ui, pageCount: 2 });
    expect(doc).toMatchObject({
      id: 'doc1',
      name: 'a.pdf',
      pageCount: 2,
      schema: SCHEMA,
      encryptedInput: false,
    });
    expect(log.mode).toBe('organize');
    const back = fromRecords(
      { ...doc, thumb: null, updatedAt: 9 },
      structuredClone(log),
    );
    expect(back).toEqual(m.getState());
  });

  it('keeps that the input had owner restrictions', () => {
    const m = makeModel(makeState(2, { ownerRestricted: true }));
    const { doc, log } = toRecords(m.getState(), ui);
    const back = fromRecords({ ...doc, thumb: null, updatedAt: 1 }, log);
    expect(back.ownerRestricted).toBe(true);
  });

  it('keeps that the user chose to save an encrypted document', () => {
    const m = makeModel(makeState(2, { encryptedInput: true }));
    m.setSaveOptIn(true);
    const { doc, log } = toRecords(m.getState(), ui);
    expect(log.saveOptIn).toBe(true);
    const back = fromRecords({ ...doc, thumb: null, updatedAt: 1 }, log);
    expect(back.saveOptIn).toBe(true);
    m.setSaveOptIn(false);
    expect(toRecords(m.getState(), ui).log.saveOptIn).toBeUndefined();
  });

  it('refuses another schema', () => {
    const m = edited();
    const { doc, log } = toRecords(m.getState(), ui);
    expect(() =>
      fromRecords({ ...doc, schema: 2, thumb: null, updatedAt: 0 }, log),
    ).toThrow(
      expect.objectContaining({
        code: 'INVALID_INPUT',
        message: "This document can't be restored by this version",
      }),
    );
  });

  it('refuses ops that fail validation', () => {
    const m = edited();
    const { doc, log } = toRecords(m.getState(), ui);
    log.log[0] = { ...log.log[0], params: { pageIds: [], delta: 45 } };
    expect(() =>
      fromRecords({ ...doc, thumb: null, updatedAt: 0 }, log),
    ).toThrow("This document can't be restored by this version");
    log.log[0] = { ...log.log[0], type: 'nope' };
    expect(() =>
      fromRecords({ ...doc, thumb: null, updatedAt: 0 }, log),
    ).toThrow("This document can't be restored by this version");
  });

  it('refuses a log that points at missing checkpoints or files', () => {
    const restore = (log: ReturnType<typeof toRecords>['log']) => {
      const { doc } = toRecords(edited().getState(), ui);
      return () => fromRecords({ ...doc, thumb: null, updatedAt: 0 }, log);
    };
    const msg = "This document can't be restored by this version";
    const fresh = () => structuredClone(toRecords(edited().getState(), ui).log);

    const badCkptRef = fresh();
    const i = badCkptRef.log.findIndex((o) => o.checkpoint);
    badCkptRef.log[i] = { ...badCkptRef.log[i], checkpoint: 'missing' };
    expect(restore(badCkptRef)).toThrow(msg);

    const badSource = fresh();
    badSource.checkpoints[1] = {
      ...badSource.checkpoints[1],
      sourceId: 'gone',
    };
    expect(restore(badSource)).toThrow(msg);

    const badFirst = fresh();
    badFirst.checkpoints[0] = { ...badFirst.checkpoints[0], index: 1 };
    expect(restore(badFirst)).toThrow(msg);

    const badMerge = fresh();
    badMerge.log.push({
      id: 'm1',
      type: 'page.mergeIn',
      v: 1,
      params: { sourceId: 'nowhere', at: 0, newIds: ['n1'], pages: [0] },
      at: 0,
      label: 'Merge in',
    });
    expect(restore(badMerge)).toThrow(msg);
  });

  it('builds blob keys under the document id', () => {
    expect(blobKey.checkpoint('d', 2)).toBe('d/ckpt/2');
    expect(blobKey.source('d', 's')).toBe('d/src/s');
    expect(blobKey.asset('d', 'a')).toBe('d/asset/a');
  });
});
