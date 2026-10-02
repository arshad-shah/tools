import { MessageChannel } from 'node:worker_threads';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { traceMask } from '@/pdf/sign/trace/trace';
import { exposeRpc, type RpcEndpoint } from '@/shared/lib/worker-rpc';
import { createPhotoClient } from './client';
import { photoHandlers } from './handlers';
import { cleanSignaturePhoto } from './pipeline';
import { ringMask, syntheticPhoto } from './test-images';

const channels: MessageChannel[] = [];
afterEach(() => {
  for (const c of channels.splice(0)) {
    c.port1.close();
    c.port2.close();
  }
});

/** The worker handlers on the other end of an in-process channel. */
function connect(): RpcEndpoint {
  const ch = new MessageChannel();
  channels.push(ch);
  exposeRpc(photoHandlers, ch.port2 as unknown as RpcEndpoint);
  ch.port1.start();
  ch.port2.start();
  return ch.port1 as unknown as RpcEndpoint;
}

const ctx = { signal: new AbortController().signal, progress: () => {} };

describe('photo worker', () => {
  it('traces through the worker exactly like the main thread', async () => {
    const client = createPhotoClient(connect);
    const mask = ringMask(48, 40, 18, 8);
    expect(await client.trace(mask)).toEqual(traceMask(mask));
    client.terminate();
  });

  it('cancels when the signal aborts and recovers on the next call', async () => {
    let connects = 0;
    const client = createPhotoClient(() => {
      connects++;
      return connect();
    });
    const mask = ringMask(48, 40, 18, 8);
    const ac = new AbortController();
    const pending = client.trace(mask, {}, ac.signal);
    ac.abort();
    await expect(pending).rejects.toMatchObject({ code: 'CANCELLED' });
    const pre = new AbortController();
    pre.abort();
    await expect(client.trace(mask, {}, pre.signal)).rejects.toMatchObject({
      code: 'CANCELLED',
    });
    expect((await client.trace(mask)).d).not.toBe('');
    expect(connects).toBe(2);
    client.terminate();
  });

  it('cleans a bitmap drawn to an OffscreenCanvas', () => {
    const rgba = syntheticPhoto();
    const drawn: unknown[] = [];
    vi.stubGlobal(
      'OffscreenCanvas',
      class {
        getContext() {
          return {
            drawImage: (b: unknown) => drawn.push(b),
            getImageData: () => ({ data: rgba }),
          };
        }
      },
    );
    const close = vi.fn();
    const bitmap = { width: 400, height: 200, close } as unknown as ImageBitmap;
    const out = photoHandlers.clean(ctx, bitmap);
    expect(drawn).toEqual([bitmap]);
    expect(close).toHaveBeenCalled();
    expect(out.value).toEqual(cleanSignaturePhoto(rgba, 400, 200));
    expect(out.transfer).toEqual([out.value.mask.data.buffer]);
    vi.unstubAllGlobals();
  });

  it('reports a browser without a 2D OffscreenCanvas context', () => {
    vi.stubGlobal(
      'OffscreenCanvas',
      class {
        getContext() {
          return null;
        }
      },
    );
    const bitmap = {
      width: 4,
      height: 4,
      close() {},
    } as unknown as ImageBitmap;
    expect(() => photoHandlers.clean(ctx, bitmap)).toThrow(
      expect.objectContaining({ code: 'UNSUPPORTED_FEATURE' }),
    );
    vi.unstubAllGlobals();
  });
});
