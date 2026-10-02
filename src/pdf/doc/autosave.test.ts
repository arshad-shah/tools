/** @vitest-environment jsdom */
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { ToolError } from '@/shared/lib/errors';
import type { IdbStore } from '@/shared/lib/storage';
import { createAutosave, type Autosave } from './autosave';
import { BlobStore } from './blob-store';
import { registerCoreOperations } from './ops';
import { defineOperation, registerOperations } from './registry';
import { makeCheckpoint, makeModel, makeSource } from './test-helpers';

/** In-memory IdbStore that records each write transaction. */
function fakeDb(fail?: () => unknown) {
  const data = new Map<string, unknown>();
  const writes: { put: string[]; del: string[] }[] = [];
  const db: IdbStore = {
    get: async (s, k) => data.get(`${s}:${k}`) as never,
    put: async (s, k, v) => void data.set(`${s}:${k}`, v),
    delete: async (s, k) => void data.delete(`${s}:${k}`),
    deletePrefix: async () => 0,
    keys: async () => [],
    getAll: async () => [],
    async write(_stores, fn) {
      const err = fail?.();
      if (err) throw err;
      const t = { put: [] as string[], del: [] as string[] };
      fn({
        put: (s, k, v) => {
          t.put.push(`${s}:${k}`);
          data.set(`${s}:${k}`, v);
        },
        delete: (s, k) => {
          t.del.push(`${s}:${k}`);
          data.delete(`${s}:${k}`);
        },
      });
      writes.push(t);
    },
    close() {},
  };
  return { db, data, writes };
}

const rotate = (id: string) => ({
  type: 'page.rotate',
  params: { pageIds: [id], delta: 90 },
});

let saver: Autosave | null = null;
function setup(
  opts: {
    enabled?: boolean;
    fail?: () => unknown;
    retryMs?: number;
    thumb?: () => Promise<Blob | null>;
    thumbTimeoutMs?: number;
  } = {},
) {
  const model = makeModel();
  const { db, data, writes } = fakeDb(opts.fail);
  const blobs = new BlobStore(db, 'doc1');
  blobs.addCheckpoint(makeCheckpoint('ckpt0', 's0'), new Uint8Array([1]));
  const onError = vi.fn();
  const persist = vi.fn(async () => true);
  const thumb = vi.fn(opts.thumb ?? (async () => new Blob(['jpg'])));
  saver = createAutosave({
    db,
    model,
    blobs,
    ui: () => ({
      mode: 'organize',
      viewport: { page: 1, zoom: { kind: 'fit-width' } },
    }),
    thumb,
    enabled: opts.enabled ?? true,
    onError,
    persist,
    now: () => 42,
    retryMs: opts.retryMs,
    thumbTimeoutMs: opts.thumbTimeoutMs,
  });
  const logWrites = () => writes.filter((w) => w.put.includes('logs:doc1'));
  return {
    model,
    data,
    writes,
    logWrites,
    blobs,
    onError,
    persist,
    thumb,
    saver,
  };
}

beforeAll(() => {
  registerCoreOperations();
  registerOperations([
    defineOperation({
      type: 'test.autosave.fix',
      v: 1,
      kind: 'checkpoint',
      mode: 'optimize',
      label: () => 'Fix',
      validate: () => ({}),
    }),
  ]);
});
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  saver?.dispose();
  saver = null;
  vi.useRealTimers();
});

describe('createAutosave', () => {
  it('debounces several dispatches into one save', async () => {
    const { model, logWrites, persist, data } = setup();
    await vi.advanceTimersByTimeAsync(800);
    expect(logWrites()).toHaveLength(1);
    model.dispatch(rotate('ckpt0:0'));
    await vi.advanceTimersByTimeAsync(300);
    model.dispatch(rotate('ckpt0:1'));
    await vi.advanceTimersByTimeAsync(300);
    model.dispatch(rotate('ckpt0:2'));
    await vi.advanceTimersByTimeAsync(800);
    expect(logWrites()).toHaveLength(2);
    expect(persist).toHaveBeenCalledTimes(1);
    expect(data.get('documents:doc1')).toMatchObject({
      id: 'doc1',
      updatedAt: 42,
      pageCount: 3,
    });
  });

  it('saves at once when the tab is hidden', async () => {
    const { model, logWrites } = setup();
    model.dispatch(rotate('ckpt0:0'));
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(0);
    expect(logWrites()).toHaveLength(1);
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    });
  });

  it('writes each blob exactly once across saves', async () => {
    const { model, writes, blobs } = setup();
    await vi.advanceTimersByTimeAsync(800);
    blobs.addSource('s2', new Uint8Array([2]));
    model.dispatch(rotate('ckpt0:0'));
    await vi.advanceTimersByTimeAsync(800);
    model.dispatch(rotate('ckpt0:1'));
    await vi.advanceTimersByTimeAsync(800);
    const blobPuts = writes.flatMap((w) =>
      w.put.filter((k) => k.startsWith('blobs:')),
    );
    expect(blobPuts).toEqual(['blobs:doc1/ckpt/0', 'blobs:doc1/src/s2']);
  });

  it('writes nothing while disabled', async () => {
    const { model, writes, saver: s } = setup({ enabled: false });
    model.dispatch(rotate('ckpt0:0'));
    await vi.advanceTimersByTimeAsync(2000);
    await s.flush();
    expect(writes).toHaveLength(0);
    s.setEnabled(true);
    expect(s.isEnabled()).toBe(true);
    await s.flush();
    expect(writes).toHaveLength(1);
  });

  it('reports a quota failure once and keeps editing in memory', async () => {
    let full = true;
    const { model, onError, logWrites } = setup({
      fail: () => (full ? new ToolError('STORAGE_FULL', 'full') : undefined),
    });
    await vi.advanceTimersByTimeAsync(800);
    model.dispatch(rotate('ckpt0:0'));
    await vi.advanceTimersByTimeAsync(800);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toMatchObject({ code: 'STORAGE_FULL' });
    expect(model.getView().pages[0].rotate).toBe(90);
    full = false;
    model.dispatch(rotate('ckpt0:1'));
    await vi.advanceTimersByTimeAsync(800);
    expect(logWrites()).toHaveLength(1);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('regenerates the thumbnail only when page 1 changes', async () => {
    const { model, thumb } = setup();
    await vi.advanceTimersByTimeAsync(800);
    model.dispatch(rotate('ckpt0:1'));
    await vi.advanceTimersByTimeAsync(800);
    expect(thumb).toHaveBeenCalledTimes(1);
    model.dispatch(rotate('ckpt0:0'));
    await vi.advanceTimersByTimeAsync(800);
    expect(thumb).toHaveBeenCalledTimes(2);
  });

  it('deletes dropped checkpoint blobs', async () => {
    const { model, writes, blobs } = setup();
    model.commitCheckpoint(
      { type: 'test.autosave.fix', params: {} },
      { id: 'c1', sourceId: 's1', byteSize: 1, pageCount: 3, createdAt: 0 },
      makeSource('s1', 3),
    );
    blobs.addCheckpoint(model.currentCheckpoint(), new Uint8Array([5]));
    await vi.advanceTimersByTimeAsync(800);
    model.undo();
    model.dispatch(rotate('ckpt0:0'));
    await vi.advanceTimersByTimeAsync(800);
    expect(writes.flatMap((w) => w.del)).toContain('blobs:doc1/ckpt/1');
    await expect(blobs.checkpointBytes('c1')).rejects.toBeDefined();
  });

  it('retries a failed save without waiting for the next edit', async () => {
    let full = true;
    const { model, onError, logWrites } = setup({
      fail: () => (full ? new ToolError('STORAGE_FULL', 'full') : undefined),
      retryMs: 5000,
    });
    model.dispatch(rotate('ckpt0:0'));
    await vi.advanceTimersByTimeAsync(800);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(logWrites()).toHaveLength(0);
    full = false;
    await vi.advanceTimersByTimeAsync(5000);
    expect(logWrites()).toHaveLength(1);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('saves without the thumbnail when it hangs', async () => {
    const { logWrites, data } = setup({
      thumb: () => new Promise<Blob | null>(() => {}),
      thumbTimeoutMs: 1000,
    });
    await vi.advanceTimersByTimeAsync(800);
    expect(logWrites()).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1000);
    expect(logWrites()).toHaveLength(1);
    expect(data.get('documents:doc1')).toMatchObject({ thumb: null });
  });

  it('saves the log and blobs as they are once the thumbnail is ready', async () => {
    let ready: (b: Blob) => void = () => {};
    const { model, data, blobs, writes } = setup({
      thumb: () => new Promise<Blob | null>((r) => (ready = r)),
    });
    await vi.advanceTimersByTimeAsync(800);
    // A change and a new blob land while the thumbnail renders.
    model.dispatch(rotate('ckpt0:1'));
    blobs.addSource('s2', new Uint8Array([2]));
    ready(new Blob(['jpg']));
    await vi.advanceTimersByTimeAsync(0);
    const log = data.get('logs:doc1') as { log: unknown[] };
    expect(log.log).toHaveLength(1);
    expect(writes[0].put).toContain('blobs:doc1/src/s2');
  });

  it('clears the saved opt-in when saving is turned off', async () => {
    const { model, data, saver: s } = setup();
    model.setSaveOptIn(true);
    await vi.advanceTimersByTimeAsync(800);
    expect(data.get('logs:doc1')).toMatchObject({ saveOptIn: true });
    model.setSaveOptIn(false);
    s.setEnabled(false);
    await s.flush();
    expect(data.get('logs:doc1')).not.toHaveProperty('saveOptIn');
  });
});
