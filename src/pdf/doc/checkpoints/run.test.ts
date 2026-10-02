import { beforeAll, describe, expect, it, vi } from 'vitest';
import { makeTextPdf, pdfPageTexts } from '../../../../test/fixtures/builders';
import { BlobStore } from '../blob-store';
import { registerCoreOperations } from '../ops';
import { defineOperation, registerOperations } from '../registry';
import { inProcessServices } from '../test-services';
import { GEOM, makeModel, makeSource } from '../test-helpers';
import { defineCheckpointRunner, registerCheckpointRunners } from './registry';
import { runCheckpoint } from './run';

const runner = defineCheckpointRunner<{ tag: string }>({
  type: 'test.run.stamp',
  async run(input) {
    return {
      bytes: input.bytes,
      report: { title: `Stamped ${input.params.tag}`, lines: [], warnings: [] },
    };
  },
});

beforeAll(() => {
  registerCoreOperations();
  registerOperations([
    defineOperation<{ tag: string }>({
      type: 'test.run.stamp',
      v: 1,
      kind: 'checkpoint',
      mode: 'optimize',
      label: (p) => `Stamp ${p.tag}`,
      validate: (p) => p as { tag: string },
    }),
  ]);
  registerCheckpointRunners([runner]);
});

async function setup() {
  const model = makeModel();
  const blobs = new BlobStore(null, 'doc1');
  blobs.addCheckpoint(
    model.currentCheckpoint(),
    await makeTextPdf({ pages: 3, label: 'Alpha' }),
  );
  return { model, blobs };
}

describe('runCheckpoint', () => {
  it('materialises pending edits, runs the runner and commits a new base', async () => {
    const { model, blobs } = await setup();
    model.dispatch({ type: 'page.delete', params: { pageIds: ['ckpt0:0'] } });
    const inspect = vi.fn(async () => [GEOM, GEOM]);
    const report = await runCheckpoint({
      model,
      blobs,
      services: inProcessServices(),
      type: 'test.run.stamp',
      params: { tag: 'x' },
      signal: new AbortController().signal,
      progress: () => {},
      inspect,
    });
    expect(report.title).toBe('Stamped x');
    const ckpt = model.currentCheckpoint();
    expect(ckpt.index).toBe(1);
    expect(ckpt.report?.title).toBe('Stamped x');
    expect(model.getView().pages).toHaveLength(2);
    expect(await pdfPageTexts(await blobs.checkpointBytes(ckpt.id))).toEqual([
      'Alpha 2',
      'Alpha 3',
    ]);
    model.undo();
    expect(model.getView().pages).toHaveLength(2);
    expect(model.currentCheckpoint().index).toBe(0);
  });

  it('commits nothing when cancelled', async () => {
    const { model, blobs } = await setup();
    const ctrl = new AbortController();
    await expect(
      runCheckpoint({
        model,
        blobs,
        services: inProcessServices(),
        type: 'test.run.stamp',
        params: { tag: 'x' },
        signal: ctrl.signal,
        progress: () => {},
        inspect: async () => {
          ctrl.abort();
          return [GEOM];
        },
      }),
    ).rejects.toMatchObject({ code: 'CANCELLED' });
    expect(model.getState().checkpoints).toHaveLength(1);
    expect(model.getState().log).toHaveLength(0);
  });

  it('marks the model busy while it runs', async () => {
    const { model, blobs } = await setup();
    const seen: boolean[] = [];
    await runCheckpoint({
      model,
      blobs,
      services: inProcessServices(),
      type: 'test.run.stamp',
      params: { tag: 'x' },
      signal: new AbortController().signal,
      progress: () => {},
      inspect: async () => {
        seen.push(model.isBusy());
        expect(() =>
          model.dispatch({
            type: 'page.rotate',
            params: { pageIds: ['ckpt0:0'], delta: 90 },
          }),
        ).toThrow(expect.objectContaining({ code: 'INVALID_INPUT' }));
        return [GEOM];
      },
    });
    expect(seen).toEqual([true]);
    expect(model.isBusy()).toBe(false);
    expect(model.getState().log).toHaveLength(1);
  });

  it('commits nothing when the history changed during the job', async () => {
    const { model, blobs } = await setup();
    await expect(
      runCheckpoint({
        model,
        blobs,
        services: inProcessServices(),
        type: 'test.run.stamp',
        params: { tag: 'x' },
        signal: new AbortController().signal,
        progress: () => {},
        inspect: async () => {
          // Something outside the job's hold changed the history.
          model.commitCheckpoint(
            { type: 'test.run.stamp', params: { tag: 'other' } },
            {
              id: 'other',
              sourceId: 's9',
              byteSize: 1,
              pageCount: 3,
              createdAt: 0,
            },
            makeSource('s9', 3),
          );
          return [GEOM];
        },
      }),
    ).rejects.toMatchObject({ code: 'CANCELLED' });
    expect(model.getState().log.map((o) => o.params)).toEqual([
      { tag: 'other' },
    ]);
    expect(model.isBusy()).toBe(false);
  });
});
