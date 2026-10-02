import { beforeAll, describe, expect, it } from 'vitest';
import { BlobStore } from './blob-store';
import { registerCoreOperations } from './ops';
import { withOverlay } from './page-map';
import { planFor } from './plan';
import { defineOperation, registerOperations } from './registry';
import { makeModel, makeSource, makeState } from './test-helpers';

beforeAll(() => {
  registerCoreOperations();
  registerOperations([
    defineOperation<{ pageId: string; assetId: string }>({
      type: 'test.plan.image',
      v: 1,
      kind: 'overlay',
      mode: 'edit',
      label: () => 'Add image',
      validate: (p) => p as { pageId: string; assetId: string },
      assets: (p) => [p.assetId],
      applyToView: (view, p, op) =>
        withOverlay(view, {
          opId: op.id,
          type: 'test.plan.image',
          pageId: p.pageId,
          params: p,
        }),
    }),
  ]);
});

describe('planFor', () => {
  it('gathers pages, sources, assets and writable overlays in log order', async () => {
    const model = makeModel();
    const blobs = new BlobStore(null, 'doc1');
    blobs.addCheckpoint(model.currentCheckpoint(), new Uint8Array([1]));
    blobs.addSource('s2', new Uint8Array([2]));
    blobs.addAsset('a1', new Uint8Array([3]));
    model.addSource(makeSource('s2', 1, 'merged'));
    model.dispatch({
      type: 'page.mergeIn',
      params: { sourceId: 's2', at: 0, newIds: ['m0'] },
    });
    const [img] = model.dispatch({
      type: 'test.plan.image',
      params: { pageId: 'ckpt0:1', assetId: 'a1' },
    });
    const [img2] = model.dispatch({
      type: 'test.plan.image',
      params: { pageId: 'ckpt0:0', assetId: 'a1' },
    });
    model.dispatch({
      type: 'object.move',
      params: { targetId: img.id, rect: { x: 1, y: 1, width: 5, height: 5 } },
    });
    const plan = await planFor(model, blobs);
    expect(plan.base).toEqual(new Uint8Array([1]));
    expect(plan.baseSourceId).toBe('s0');
    expect(plan.pages.map((p) => p.id)).toEqual([
      'm0',
      'ckpt0:0',
      'ckpt0:1',
      'ckpt0:2',
    ]);
    expect(Object.keys(plan.sources)).toEqual(['s2']);
    expect(plan.assets).toEqual({ a1: new Uint8Array([3]) });
    expect(plan.overlays.map((o) => o.opId)).toEqual([img.id, img2.id]);
    expect(plan.overlays[0].params).toMatchObject({
      rect: { x: 1, y: 1, width: 5, height: 5 },
    });

    const only = await planFor(model, blobs, { onlyPages: ['ckpt0:0'] });
    expect(only.pages.map((p) => p.id)).toEqual(['ckpt0:0']);
    expect(only.sources).toEqual({});
    expect(only.overlays.map((o) => o.opId)).toEqual([img2.id]);
  });

  it('remaps page labels to the pages a subset keeps', async () => {
    const model = makeModel(makeState(5));
    const blobs = new BlobStore(null, 'doc1');
    blobs.addCheckpoint(model.currentCheckpoint(), new Uint8Array([1]));
    // i, ii, A-1, A-2, A-3
    model.dispatch({
      type: 'page.label',
      params: {
        ranges: [
          { start: 0, style: 'r' },
          { start: 2, style: 'D', prefix: 'A-' },
        ],
      },
    });
    const full = await planFor(model, blobs);
    expect(full.pageLabels).toEqual(model.getView().pageLabels);
    const tail = await planFor(model, blobs, {
      onlyPages: ['ckpt0:3', 'ckpt0:4'],
    });
    expect(tail.pageLabels).toEqual([
      { start: 0, style: 'D', prefix: 'A-', first: 2 },
    ]);
    const mixed = await planFor(model, blobs, {
      onlyPages: ['ckpt0:1', 'ckpt0:4'],
    });
    expect(mixed.pageLabels).toEqual([
      { start: 0, style: 'r', first: 2 },
      { start: 1, style: 'D', prefix: 'A-', first: 3 },
    ]);
  });
});
