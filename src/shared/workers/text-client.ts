import {
  createKillableClient,
  type KillableClient,
} from '@/shared/lib/killable-client';
import type { RpcEndpoint } from '@/shared/lib/worker-rpc';
import type { TextHandlers } from './handlers';

const connectWorker = (): RpcEndpoint =>
  new Worker(new URL('./text.worker.ts', import.meta.url), {
    type: 'module',
  });

export interface TextWorkerOptions {
  /** Default per-call budget; a call over it rejects TIMEOUT. */
  timeoutMs?: number;
  /** Test seam: an in-process endpoint instead of a real Worker. */
  connect?: () => RpcEndpoint;
}

/**
 * A dedicated, killable text worker (spec §4.4) for user-supplied patterns
 * and long cancellable jobs: a timeout or abort kills only this instance,
 * never another tool's job. Call `terminate()` when the owner unmounts.
 */
export function createTextWorker(
  opts: TextWorkerOptions = {},
): KillableClient<TextHandlers> {
  return createKillableClient<TextHandlers>(opts.connect ?? connectWorker, {
    timeoutMs: opts.timeoutMs,
  });
}

/**
 * A text worker meant to be shared: a timeout or abort cancels only that
 * call (its handler sees the signal) and never terminates the worker, so
 * one tool's cancel cannot fail another tool's job.
 */
export function createSharedTextWorker(
  opts: Pick<TextWorkerOptions, 'connect'> = {},
): KillableClient<TextHandlers> {
  return createKillableClient<TextHandlers>(opts.connect ?? connectWorker, {
    kill: false,
  });
}

let shared: KillableClient<TextHandlers> | null = null;

/**
 * The shared text worker for short, trusted jobs (no default timeout).
 * Handlers must honour `ctx.signal`; untrusted or uninterruptible work goes
 * to a dedicated `createTextWorker()`.
 */
export function textWorker(): KillableClient<TextHandlers> {
  shared ??= createSharedTextWorker();
  return shared;
}
