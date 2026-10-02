import { beforeAll, describe, expect, it, vi } from 'vitest';
import { notify } from '@/shared/lib/notify';
import { BlobStore } from '@/pdf/doc/blob-store';
import { registerCoreOperations } from '@/pdf/doc/ops';
import { inProcessServices } from '@/pdf/doc/test-services';
import { makeModel, makeState } from '@/pdf/doc/test-helpers';
import type { DocInfo } from '@/pdf/render';
import { createDocumentApi, RESTRICTED_MESSAGE } from './document-api';
import { SourceDocs } from './source-docs';

const info = (docId: string, pages = 1): DocInfo => ({
  docId,
  pageCount: pages,
  pages: Array.from({ length: pages }, () => ({
    width: 612,
    height: 792,
    view: [0, 0, 612, 792],
    rotate: 0,
  })),
});

function setup(restricted = false) {
  const goToPage = vi.fn();
  const model = makeModel(makeState(3, { restricted }));
  const blobs = new BlobStore(null, 'doc1');
  const render = {
    open: vi.fn(async () => info('r2', 2)),
    close: vi.fn(async () => {}),
    onRestart: () => () => {},
    generation: () => 0,
    textItems: vi.fn(async () => ({ items: [], styles: {} })),
  };
  const services = inProcessServices({ render: render as never });
  const sourceDocs = new SourceDocs(
    render as never,
    async () => new Uint8Array(),
  );
  sourceDocs.seed('s0', info('r1', 3));
  const api = createDocumentApi({
    model,
    blobs,
    services,
    sourceDocs,
    currentPage: 'ckpt0:0',
    announce: vi.fn(),
    runJob: async (_t, fn) =>
      fn({ signal: new AbortController().signal, progress: () => {} }),
    confirm: async () => true,
    goToPage,
  });
  return { model, api, render, blobs, sourceDocs, goToPage };
}

beforeAll(() => registerCoreOperations());

describe('createDocumentApi', () => {
  it('hashes the opened file: the same bytes give the same key', async () => {
    const a = setup();
    const b = setup();
    a.blobs.addCheckpoint(a.model.currentCheckpoint(), new Uint8Array([7, 8]));
    b.blobs.addCheckpoint(b.model.currentCheckpoint(), new Uint8Array([7, 8]));
    const ha = await a.api.contentHash();
    expect(ha).toMatch(/^[0-9a-f]{16}$/);
    expect(await b.api.contentHash()).toBe(ha);
  });

  it('reads back a stored asset and lists the visible pages', async () => {
    const { api } = setup();
    const id = api.addAsset(new Uint8Array([1, 2, 3]), 'image/png');
    expect([...(await api.assetBytes(id))]).toEqual([1, 2, 3]);
    expect(api.visiblePages).toEqual([]);
  });

  it('dispatches and reports invalid edits instead of throwing', () => {
    const error = vi.spyOn(notify, 'error').mockImplementation(() => '');
    const { api, model } = setup();
    expect(
      api.dispatch({
        type: 'page.rotate',
        params: { pageIds: ['ckpt0:0'], delta: 90 },
      }),
    ).toHaveLength(1);
    expect(
      api.dispatch({
        type: 'page.delete',
        params: { pageIds: ['ckpt0:0', 'ckpt0:1', 'ckpt0:2'] },
      }),
    ).toEqual([]);
    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'The document must keep at least one page',
      }),
    );
    expect(model.getState().cursor).toBe(1);
  });

  it('refuses edits on a restricted document', () => {
    const error = vi.spyOn(notify, 'error').mockImplementation(() => '');
    const { api } = setup(true);
    expect(
      api.dispatch({
        type: 'page.rotate',
        params: { pageIds: ['ckpt0:0'], delta: 90 },
      }),
    ).toEqual([]);
    expect(error.mock.calls[0][0]).toMatchObject({
      message: RESTRICTED_MESSAGE,
    });
  });

  it('adds merged sources and assets', async () => {
    const { api, model, blobs, sourceDocs } = setup();
    const id = await api.addSource(new Uint8Array([1, 2]), 'b.pdf');
    expect(model.getState().sources[id]).toMatchObject({
      name: 'b.pdf',
      pageCount: 2,
      origin: 'merged',
    });
    expect(await blobs.sourceBytes(id)).toEqual(new Uint8Array([1, 2]));
    expect(sourceDocs.get(id)?.docId).toBe('r2');
    const asset = api.addAsset(new Uint8Array([9]), 'image/png');
    expect(await blobs.assetBytes(asset)).toEqual(new Uint8Array([9]));
    expect(() =>
      api.addAsset(new Uint8Array(25 * 1024 * 1024 + 1), 'image/png'),
    ).toThrow(expect.objectContaining({ code: 'TOO_LARGE' }));
  });

  it('removeSource rolls back a merged file nothing uses', async () => {
    const { api, model, blobs, sourceDocs, render } = setup();
    const id = await api.addSource(new Uint8Array([1, 2]), 'b.pdf');
    api.removeSource(id);
    expect(model.getState().sources[id]).toBeUndefined();
    await expect(blobs.sourceBytes(id)).rejects.toBeDefined();
    expect(blobs.pendingWrites()).toEqual([]);
    expect(sourceDocs.get(id)).toBeUndefined();
    expect(render.close).toHaveBeenCalledWith('r2');
    expect(sourceDocs.get('s0')?.docId).toBe('r1');
  });

  it('geometry and text go through the page source', async () => {
    const { api, render } = setup();
    const page = api.view.pages[0];
    expect(api.pageGeom(page)).toEqual({ view: [0, 0, 612, 792], rotate: 0 });
    expect(api.viewport({ ...page, rotate: 90 }, 1)).toMatchObject({
      width: 792,
      height: 612,
    });
    await api.text(page);
    expect(render.textItems).toHaveBeenCalledWith('r1', 0);
  });

  it('navigates the canvas to a page or a box on it', () => {
    const { api, goToPage } = setup();
    const box = { x: 72, y: 600, width: 200, height: 20 };
    api.goToPage('ckpt0:2', { box, focus: false });
    expect(goToPage).toHaveBeenCalledWith('ckpt0:2', { box, focus: false });
    api.goToPage('ckpt0:1');
    expect(goToPage).toHaveBeenLastCalledWith('ckpt0:1', {});
  });

  it('ignores navigation to a page that is not in the document', () => {
    const { api, goToPage } = setup();
    api.goToPage('nope');
    expect(goToPage).not.toHaveBeenCalled();
  });
});
