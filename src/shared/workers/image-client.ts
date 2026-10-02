import {
  createKillableClient,
  type KillableClient,
} from '@/shared/lib/killable-client';
import type { RpcEndpoint } from '@/shared/lib/worker-rpc';
import type { ImageHandlers } from './image-handlers';

const connectWorker = (): RpcEndpoint =>
  new Worker(new URL('./image.worker.ts', import.meta.url), {
    type: 'module',
  });

export interface ImageWorkerOptions {
  timeoutMs?: number;
  /** Test seam: an in-process endpoint instead of a real Worker. */
  connect?: () => RpcEndpoint;
}

export type ImageClient = KillableClient<ImageHandlers>;

/**
 * A dedicated, killable image worker. Cancelling a job terminates this
 * instance only, so batch runners give every concurrent lane its own client
 * and a cancel never takes a sibling job down. Call `terminate()` when done.
 */
export function createImageWorker(opts: ImageWorkerOptions = {}): ImageClient {
  return createKillableClient<ImageHandlers>(opts.connect ?? connectWorker, {
    timeoutMs: opts.timeoutMs,
  });
}

let shared: ImageClient | null = null;

/** The shared image worker for short one-off jobs (estimates, palettes). */
export function imageClient(): ImageClient {
  shared ??= createImageWorker();
  return shared;
}
