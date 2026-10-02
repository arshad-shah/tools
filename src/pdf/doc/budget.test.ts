import 'fake-indexeddb/auto';
import { beforeAll, describe, expect, it } from 'vitest';
import { newId } from '@/shared/lib/id';
import { openIdb, WORKSPACE_DB } from '@/shared/lib/storage';
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
    const dropped = await enforceCheckpointBudget(db, m, { quota: 100 * MB });
    expect(dropped.map((c) => c.id)).toEqual(['ckpt0']);
    expect(await db.keys('blobs')).toEqual(['doc1/ckpt/1', 'doc1/ckpt/2']);
    expect(m.getState().checkpoints[0].available).toBe(false);
    m.undo();
    expect(m.canUndo()).toBe(false);
    expect(await enforceCheckpointBudget(db, m, null)).toEqual([]);
    db.close();
  });
});
