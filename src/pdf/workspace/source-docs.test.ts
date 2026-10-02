import { describe, expect, it, vi } from 'vitest';
import type { DocInfo } from '@/pdf/render';
import { SourceDocs } from './source-docs';

const info = (docId: string): DocInfo => ({ docId, pageCount: 1, pages: [] });

describe('SourceDocs', () => {
  it('opens sources on demand, once, and reopens after a restart', async () => {
    let restart = () => {};
    let n = 0;
    const render = {
      open: vi.fn(async () => info(`d${n++}`)),
      close: vi.fn(async () => {}),
      onRestart: (l: () => void) => {
        restart = l;
        return () => {};
      },
      generation: () => 0,
    };
    const docs = new SourceDocs(render, async () => new Uint8Array([1]));
    const seen = vi.fn();
    docs.subscribe(seen);
    docs.ensure(['a', 'a']);
    await vi.waitFor(() => expect(docs.get('a')?.docId).toBe('d0'));
    expect(render.open).toHaveBeenCalledTimes(1);
    expect(seen).toHaveBeenCalled();
    restart();
    expect(docs.get('a')).toBeUndefined();
    await vi.waitFor(() => expect(docs.get('a')?.docId).toBe('d1'));
    docs.release([]);
    expect(render.close).toHaveBeenCalledWith('d1');
    expect(docs.snapshot()).toEqual({});
  });

  it('records open failures', async () => {
    const render = {
      open: vi.fn(async () => {
        throw new Error('bad');
      }),
      close: vi.fn(async () => {}),
      onRestart: () => () => {},
      generation: () => 0,
    };
    const docs = new SourceDocs(render, async () => new Uint8Array());
    docs.ensure(['x']);
    await vi.waitFor(() => expect(docs.get('x')?.error?.message).toBe('bad'));
  });

  it('show() keeps only the shown sources open and purges closed bitmaps', async () => {
    let n = 0;
    const render = {
      open: vi.fn(async () => info(`d${n++}`)),
      close: vi.fn(async () => {}),
      onRestart: () => () => {},
      generation: () => 0,
    };
    const purged = vi.fn();
    const docs = new SourceDocs(
      render,
      async () => new Uint8Array([1]),
      purged,
    );
    docs.show(['old']);
    await vi.waitFor(() => expect(docs.get('old')?.docId).toBe('d0'));
    // A checkpoint superseded the old base: only the new one is shown.
    docs.show(['new']);
    expect(render.close).toHaveBeenCalledWith('d0');
    expect(purged).toHaveBeenCalledWith('d0');
    expect(docs.get('old')).toBeUndefined();
    await vi.waitFor(() => expect(docs.get('new')?.docId).toBe('d1'));
  });
});
