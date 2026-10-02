import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { newId } from '@/shared/lib/id';
import { openIdb, WORKSPACE_DB } from '@/shared/lib/storage';
import { BlobStore } from './blob-store';
import { makeCheckpoint } from './test-helpers';

const db = () => openIdb({ ...WORKSPACE_DB, name: `t-${newId()}` }, indexedDB);
const bytes = (n: number) => new Uint8Array([n, n, n]);

describe('BlobStore', () => {
  it('serves bytes from memory and queues each blob once', async () => {
    const store = new BlobStore(null, 'd');
    store.addCheckpoint(makeCheckpoint('c0', 's0', 0), bytes(1));
    store.addSource('s2', bytes(2));
    store.addAsset('a', bytes(3));
    expect(await store.checkpointBytes('c0')).toEqual(bytes(1));
    expect(await store.sourceBytes('s2')).toEqual(bytes(2));
    expect(await store.assetBytes('a')).toEqual(bytes(3));
    const keys = store.pendingWrites().map((w) => w.key);
    expect(keys.sort()).toEqual(['d/asset/a', 'd/ckpt/0', 'd/src/s2']);
    store.markWritten(keys);
    expect(store.pendingWrites()).toEqual([]);
  });

  it('reads evicted checkpoints back from IndexedDB', async () => {
    const idb = await db();
    const store = new BlobStore(idb, 'd');
    const metas = [0, 1, 2].map((i) => makeCheckpoint(`c${i}`, `s${i}`, i));
    metas.forEach((m, i) => store.addCheckpoint(m, bytes(i)));
    for (const w of store.pendingWrites())
      await idb.put('blobs', w.key, w.blob);
    store.markWritten(store.pendingWrites().map((w) => w.key));
    store.keepInMemory('c2', 'c1');
    expect(await store.checkpointBytes('c0')).toEqual(bytes(0));
    await idb.delete('blobs', 'd/ckpt/0');
    await expect(store.checkpointBytes('c0')).rejects.toMatchObject({
      code: 'INVALID_INPUT',
      message: 'This undo step is no longer available on this device',
    });
    idb.close();
  });

  it('never evicts bytes that are not on disk yet', async () => {
    const idb = await db();
    const store = new BlobStore(idb, 'd');
    store.addCheckpoint(makeCheckpoint('c0', 's0', 0), bytes(7));
    store.keepInMemory('c1', null);
    expect(await store.checkpointBytes('c0')).toEqual(bytes(7));
    idb.close();
  });

  it('drop forgets keys at once and deletes them on disk', async () => {
    const idb = await db();
    const store = new BlobStore(idb, 'd');
    await idb.put('blobs', 'd/ckpt/1', new Blob([bytes(1)]));
    store.knowCheckpoints([makeCheckpoint('old', 's', 1)]);
    const dropping = store.drop(['d/ckpt/1']);
    store.addCheckpoint(makeCheckpoint('new', 's9', 1), bytes(9));
    await dropping;
    expect(await store.checkpointBytes('new')).toEqual(bytes(9));
    await expect(store.checkpointBytes('old')).rejects.toBeDefined();
    expect(store.pendingWrites().map((w) => w.key)).toEqual(['d/ckpt/1']);
    idb.close();
  });
});
