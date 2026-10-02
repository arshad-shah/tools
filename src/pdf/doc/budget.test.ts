import 'fake-indexeddb/auto';
import { beforeAll, describe, expect, it } from 'vitest';
import { newId } from '@/shared/lib/id';
import { openIdb, WORKSPACE_DB } from '@/shared/lib/storage';
import { BlobStore } from './blob-store';
import { enforceCheckpointBudget } from './budget';
import { registerCoreOperations } from './ops';
import { defineOperation, registerOperations } from './registry';
import {
  makeModel,
  makeSource,
  makeState,
  makeCheckpoint,
} from './test-helpers';

const MB = 1024 * 1024;
beforeAll(() => {
  registerCoreOperations();
  registerOperations([
    defineOperation({
      type: 'test.budget.fix',
      v: 1,
      kind: 'checkpoint',
      mode: 'optimize',
      label: () => 'Fix',
      validate: () => ({}),
    }),
  ]);
});

describe('enforceCheckpointBudget', () => {
  it('drops the oldest checkpoint over the cap and stops undo there', async () => {
    const db = await openIdb(
      { ...WORKSPACE_DB, name: `t-${newId()}` },
      indexedDB,
    );
    const m = makeModel(
      makeState(3, {
        checkpoints: [makeCheckpoint('ckpt0', 's0', 0, 30 * MB)],
      }),
    );
    for (const i of [1, 2]) {
      m.commitCheckpoint(
        { type: 'test.budget.fix', params: {} },
        {
          id: `c${i}`,
          sourceId: `s${i}`,
          byteSize: 30 * MB,
          pageCount: 3,
          createdAt: i,
        },
        makeSource(`s${i}`, 3),
      );
    }
    for (const i of [0, 1, 2])
      await db.put('blobs', `doc1/ckpt/${i}`, new Blob(['x']));
    const blobs = new BlobStore(db, 'doc1');
    blobs.knowCheckpoints(m.getState().checkpoints);
    const dropped = await enforceCheckpointBudget(m, blobs, {
      quota: 100 * MB,
    });
    expect(dropped.map((c) => c.id)).toEqual(['ckpt0']);
    expect(await db.keys('blobs')).toEqual(['doc1/ckpt/1', 'doc1/ckpt/2']);
    expect(m.getState().checkpoints[0].available).toBe(false);
    m.undo();
    expect(m.canUndo()).toBe(false);
    expect(await enforceCheckpointBudget(m, blobs, null)).toEqual([]);
    db.close();
  });

  function threeCheckpoints() {
    const m = makeModel(
      makeState(3, {
        checkpoints: [makeCheckpoint('ckpt0', 's0', 0, 30 * MB)],
      }),
    );
    for (const i of [1, 2])
      m.commitCheckpoint(
        { type: 'test.budget.fix', params: {} },
        {
          id: `c${i}`,
          sourceId: `s${i}`,
          byteSize: 30 * MB,
          pageCount: 3,
          createdAt: i,
        },
        makeSource(`s${i}`, 3),
      );
    return m;
  }

  it('forgets a dropped checkpoint that was still waiting to be written', async () => {
    const db = await openIdb(
      { ...WORKSPACE_DB, name: `t-${newId()}` },
      indexedDB,
    );
    const m = threeCheckpoints();
    const blobs = new BlobStore(db, 'doc1');
    for (const c of m.getState().checkpoints)
      blobs.addCheckpoint(c, new Uint8Array(4));
    const dropped = await enforceCheckpointBudget(m, blobs, {
      quota: 100 * MB,
    });
    expect(dropped.map((c) => c.id)).toEqual(['ckpt0']);
    // The next save must not write the dropped bytes back.
    expect(blobs.pendingWrites().map((w) => w.key)).toEqual([
      'doc1/ckpt/1',
      'doc1/ckpt/2',
    ]);
    db.close();
  });

  it('counts merged sources and assets against the cap', async () => {
    const db = await openIdb(
      { ...WORKSPACE_DB, name: `t-${newId()}` },
      indexedDB,
    );
    const m = threeCheckpoints();
    const blobs = new BlobStore(db, 'doc1');
    blobs.knowCheckpoints(m.getState().checkpoints);
    // 90 MB of checkpoints fit a 100 MB cap alone, not with 20 MB more.
    await db.put('blobs', 'doc1/src/m1', new Blob([new Uint8Array(10 * MB)]));
    blobs.addAsset('a1', new Uint8Array(10 * MB));
    const dropped = await enforceCheckpointBudget(m, blobs, {
      quota: 200 * MB,
    });
    expect(dropped.map((c) => c.id)).toEqual(['ckpt0']);
    db.close();
  });
});
