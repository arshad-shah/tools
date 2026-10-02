/**
 * Photo clean-up and tracing over a worker. Both run synchronously inside
 * the worker, so an abort cannot interrupt them: the caller's signal
 * cancels by terminating the worker (failing any other call in flight with
 * CANCELLED), and the next call starts a fresh one (the worker holds no
 * state).
 */
import type { InkVector } from '@/pdf/sign/ink';
import type { TraceOptions } from '@/pdf/sign/trace/trace';
import { ToolError } from '@/shared/lib/errors';
import {
  createRpcClient,
  type CallOptions,
  type RpcClient,
  type RpcEndpoint,
} from '@/shared/lib/worker-rpc';
import type { Mask } from './binarize';
import type { PhotoHandlers } from './handlers';
import type { CleanOptions, PhotoResult } from './pipeline';

export interface PhotoClient {
  /**
   * Cleans a signature photo. The bitmap is transferred to the worker and
   * closed there: do not use it afterwards.
   */
  clean(
    bitmap: ImageBitmap,
    opts?: CleanOptions,
    signal?: AbortSignal,
  ): Promise<PhotoResult>;
  /** Traces a mask to vector path data off the main thread (the mask is copied). */
  trace(
    mask: Mask,
    opts?: TraceOptions,
    signal?: AbortSignal,
  ): Promise<InkVector>;
  terminate(): void;
}

export function createPhotoClient(connect: () => RpcEndpoint): PhotoClient {
  let client: RpcClient<PhotoHandlers> = createRpcClient(connect);

  /** Runs one call; an abort terminates the worker it was sent to. */
  async function run<T>(
    signal: AbortSignal | undefined,
    send: (c: RpcClient<PhotoHandlers>, o: CallOptions) => Promise<T>,
  ): Promise<T> {
    if (signal?.aborted) throw new ToolError('CANCELLED', 'Cancelled');
    const owner = client;
    let settled = false;
    const kill = () => {
      if (settled || client !== owner) return;
      owner.terminate();
      client = createRpcClient(connect);
    };
    signal?.addEventListener('abort', kill, { once: true });
    try {
      return await send(owner, { signal });
    } finally {
      settled = true;
      signal?.removeEventListener('abort', kill);
    }
  }

  return {
    clean(bitmap, opts = {}, signal) {
      return run(signal, (c, o) =>
        c.call('clean', [bitmap, opts], { ...o, transfer: [bitmap] }),
      );
    },
    trace(mask, opts = {}, signal) {
      return run(signal, (c, o) => c.call('trace', [mask, opts], o));
    },
    terminate() {
      client.terminate();
    },
  };
}

let shared: PhotoClient | null = null;

/** The shared photo worker client, created on first use. */
export function photoClient(): PhotoClient {
  shared ??= createPhotoClient(
    () =>
      new Worker(new URL('./photo.worker.ts', import.meta.url), {
        type: 'module',
        name: 'signature-photo',
      }) as unknown as RpcEndpoint,
  );
  return shared;
}
