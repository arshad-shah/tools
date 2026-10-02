import 'fake-indexeddb/auto';
import { beforeAll, describe, expect, it } from 'vitest';
import { ToolError } from '@/shared/lib/errors';
import { newId } from '@/shared/lib/id';
import { openIdb, WORKSPACE_DB, type IdbStore } from '@/shared/lib/storage';
import { createAutosave } from './autosave';
import { BlobStore } from './blob-store';
import { registerCoreOperations } from './ops';
import {
  clearDocuments,
  deleteDocument,
  enforceRetention,
  listRecentDocuments,
  restoreDocument,
} from './recent';
import { SCHEMA, toRecords } from './serialize';
import { makeCheckpoint, makeModel, makeState } from './test-helpers';

const ui = {
  mode: 'organize' as const,
  viewport: { page: 1, zoom: { kind: 'fit-width' as const } },
};
const open = () =>
  openIdb({ ...WORKSPACE_DB, name: `t-${newId()}` }, indexedDB);

async function saveDoc(
  db: IdbStore,
  id: string,
  updatedAt: number,
  schema = SCHEMA,
) {
  const m = makeModel(makeState(3, { id }));
  m.dispatch({
    type: 'page.rotate',
    params: { pageIds: ['ckpt0:0'], delta: 90 },
  });
  const { doc, log } = toRecords(m.getState(), ui);
  await db.put('documents', id, { ...doc, schema, thumb: null, updatedAt });
  await db.put('logs', id, log);
  await db.put('blobs', `${id}/ckpt/0`, new Blob(['x']));
  return m;
}

beforeAll(() => registerCoreOperations());

describe('recent documents', () => {
  it('lists newest first and flags other schemas', async () => {
    const db = await open();
    await saveDoc(db, 'a', 1);
    await saveDoc(db, 'b', 3);
    await saveDoc(db, 'c', 2, 2);
    const list = await listRecentDocuments(db);
    expect(list.map((d) => [d.id, d.restorable])).toEqual([
      ['b', true],
      ['c', false],
      ['a', true],
    ]);
    db.close();
  });

  it('restores state, ui and bytes', async () => {
    const db = await open();
    const m = await saveDoc(db, 'a', 1);
    const { state, ui: back, blobs } = await restoreDocument(db, 'a');
    expect(state).toEqual(m.getState());
    expect(back).toEqual(ui);
    expect(await blobs.checkpointBytes('ckpt0')).toEqual(new Uint8Array([120]));
    await expect(restoreDocument(db, 'zz')).rejects.toMatchObject({
      code: 'INVALID_INPUT',
    });
    db.close();
  });

  it('refuses a document of another schema', async () => {
    const db = await open();
    await saveDoc(db, 'a', 1, 2);
    await expect(restoreDocument(db, 'a')).rejects.toThrow(
      "This document can't be restored by this version",
    );
    db.close();
  });

  it('keeps the ten most recent and never the open one', async () => {
    const db = await open();
    for (let i = 0; i < 12; i++) await saveDoc(db, `d${i}`, 100 + i);
    const deleted = await enforceRetention(db, 'd0');
    expect(deleted.sort()).toEqual(['d1', 'd2']);
    expect(await db.get('documents', 'd1')).toBeUndefined();
    expect(await db.get('logs', 'd1')).toBeUndefined();
    expect(await db.keys('blobs', 'd1/')).toEqual([]);
    expect(await db.get('documents', 'd0')).toBeDefined();
    db.close();
  });

  it('deletes one or all documents with their blobs', async () => {
    const db = await open();
    await saveDoc(db, 'a', 1);
    await saveDoc(db, 'b', 2);
    await deleteDocument(db, 'a');
    expect((await listRecentDocuments(db)).map((d) => d.id)).toEqual(['b']);
    await clearDocuments(db);
    expect(await listRecentDocuments(db)).toEqual([]);
    expect(await db.keys('blobs')).toEqual([]);
    db.close();
  });

  it('clears the other documents but keeps the open one', async () => {
    const db = await open();
    await saveDoc(db, 'a', 1);
    await saveDoc(db, 'b', 2);
    await db.put('blobs', 'zz/src/x', new Blob(['orphan']));
    await clearDocuments(db, 'a');
    expect((await listRecentDocuments(db)).map((d) => d.id)).toEqual(['a']);
    expect(await db.keys('blobs')).toEqual(['a/ckpt/0']);
    db.close();
  });

  it('restores the open document after STORAGE_FULL, clear and flush', async () => {
    const real = await open();
    let full = false;
    const db: IdbStore = {
      ...real,
      async write(stores, fn) {
        if (full) throw new ToolError('STORAGE_FULL', 'full');
        return real.write(stores, fn);
      },
    };
    await saveDoc(db, 'old', 1);
    const model = makeModel(makeState(3, { id: 'a' }));
    const blobs = new BlobStore(db, 'a');
    blobs.addCheckpoint(makeCheckpoint('ckpt0', 's0'), new Uint8Array([7]));
    const saver = createAutosave({
      db,
      model,
      blobs,
      ui: () => ui,
      thumb: async () => null,
      enabled: true,
      debounceMs: 60_000,
      retryMs: 60_000,
      onError: () => {},
      persist: async () => true,
    });
    await saver.flush();
    full = true;
    model.dispatch({
      type: 'page.rotate',
      params: { pageIds: ['ckpt0:0'], delta: 90 },
    });
    await saver.flush();
    full = false;
    await clearDocuments(db, 'a');
    await saver.flush();
    saver.dispose();
    const { state, blobs: back } = await restoreDocument(db, 'a');
    expect(state).toEqual(model.getState());
    expect(await back.checkpointBytes('ckpt0')).toEqual(new Uint8Array([7]));
    expect((await listRecentDocuments(db)).map((d) => d.id)).toEqual(['a']);
    real.close();
  });
});
