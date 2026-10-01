import {
  deserializeCause,
  serializeCause,
  ToolError,
  toToolError,
  type SerializedCause,
  type ToolErrorCode,
} from './errors';
import type { JobProgress } from '@/shared/state/useJob';

/** Anything message-shaped: Worker, MessagePort, a worker's `self`. */
export interface RpcEndpoint {
  postMessage(message: unknown, transfer: Transferable[]): void;
  addEventListener(type: string, listener: (event: MessageEvent) => void): void;
  removeEventListener(
    type: string,
    listener: (event: MessageEvent) => void,
  ): void;
  terminate?(): void;
  close?(): void;
}

export interface RpcContext {
  signal: AbortSignal;
  progress(p: JobProgress): void;
}

export type RpcHandlers = Record<
  string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (ctx: RpcContext, ...args: any[]) => unknown
>;

/** Return this from a handler to transfer (not copy) buffers back. */
export class Transferred<T> {
  constructor(
    readonly value: T,
    readonly transfer: Transferable[],
  ) {}
}

type ArgsOf<F> = F extends (ctx: RpcContext, ...args: infer A) => unknown
  ? A
  : never;
type Unwrap<T> = T extends Transferred<infer V> ? V : T;
type ResultOf<F> = F extends (...args: never[]) => infer R
  ? Unwrap<Awaited<R>>
  : never;

type Request =
  | { type: 'call'; id: number; method: string; args: unknown[] }
  | { type: 'abort'; id: number };
type Response =
  | { type: 'result'; id: number; value: unknown }
  | {
      type: 'error';
      id: number;
      error: {
        code: ToolErrorCode;
        message: string;
        cause?: SerializedCause;
      };
    }
  | { type: 'progress'; id: number; value: JobProgress };

export function exposeRpc<H extends RpcHandlers>(
  handlers: H,
  endpoint: RpcEndpoint,
): () => void {
  const controllers = new Map<number, AbortController>();

  const onMessage = async (event: MessageEvent) => {
    const msg = event.data as Request;
    if (msg.type === 'abort') {
      controllers.get(msg.id)?.abort();
      return;
    }
    if (msg.type !== 'call') return;
    const { id } = msg;
    const handler = handlers[msg.method];
    if (!handler) {
      endpoint.postMessage(
        {
          type: 'error',
          id,
          error: { code: 'UNKNOWN', message: `Unknown method ${msg.method}` },
        },
        [],
      );
      return;
    }
    const ctrl = new AbortController();
    controllers.set(id, ctrl);
    try {
      const out = await handler(
        {
          signal: ctrl.signal,
          progress: (value) =>
            endpoint.postMessage({ type: 'progress', id, value }, []),
        },
        ...msg.args,
      );
      if (out instanceof Transferred)
        endpoint.postMessage(
          { type: 'result', id, value: out.value },
          out.transfer,
        );
      else endpoint.postMessage({ type: 'result', id, value: out }, []);
    } catch (e) {
      const err = ctrl.signal.aborted
        ? new ToolError('CANCELLED', 'Cancelled')
        : toToolError(e);
      // Logged on the worker's own console too: its stack is only there.
      if (import.meta.env.DEV && err.code !== 'CANCELLED')
        console.error('[rpc]', msg.method, err);
      endpoint.postMessage(
        {
          type: 'error',
          id,
          error: {
            code: err.code,
            message: err.message,
            cause: serializeCause(err.cause),
          },
        },
        [],
      );
    } finally {
      controllers.delete(id);
    }
  };

  endpoint.addEventListener('message', onMessage);
  return () => endpoint.removeEventListener('message', onMessage);
}

export interface CallOptions {
  signal?: AbortSignal;
  transfer?: Transferable[];
  onProgress?: (p: JobProgress) => void;
}

export interface RpcClient<H extends RpcHandlers> {
  call<K extends keyof H & string>(
    method: K,
    args: ArgsOf<H[K]>,
    opts?: CallOptions,
  ): Promise<ResultOf<H[K]>>;
  terminate(): void;
  /**
   * Bumped each time the worker is lost to a crash. Anything the old worker
   * held (open documents, caches) is gone; callers compare generations to
   * detect that and re-create their state.
   */
  readonly generation: number;
  /** Called after a crash has bumped `generation`. Returns an unsubscribe. */
  onRestart(listener: () => void): () => void;
}

interface Pending {
  resolve(v: unknown): void;
  reject(e: unknown): void;
  onProgress?: (p: JobProgress) => void;
  cleanup(): void;
}

export function createRpcClient<H extends RpcHandlers>(
  connect: () => RpcEndpoint,
  { maxRestarts = 1 }: { maxRestarts?: number } = {},
): RpcClient<H> {
  let endpoint: RpcEndpoint | null = null;
  let nextId = 1;
  let crashes = 0;
  let generation = 0;
  const restartListeners = new Set<() => void>();
  const pending = new Map<number, Pending>();

  const failAll = (err: ToolError) => {
    for (const p of pending.values()) {
      p.cleanup();
      p.reject(err);
    }
    pending.clear();
  };

  const onMessage = (event: MessageEvent) => {
    const msg = event.data as Response;
    const p = pending.get(msg.id);
    if (!p) return;
    if (msg.type === 'progress') {
      p.onProgress?.(msg.value);
      return;
    }
    pending.delete(msg.id);
    p.cleanup();
    // The restart limit applies to CONSECUTIVE crashes: any successful
    // response proves the worker is healthy, so reset the counter.
    crashes = 0;
    if (msg.type === 'result') p.resolve(msg.value);
    else {
      const { code, message, cause } = msg.error;
      p.reject(
        new ToolError(
          code,
          message,
          cause ? { cause: deserializeCause(cause) } : undefined,
        ),
      );
    }
  };

  const detach = (ep: RpcEndpoint) => {
    ep.removeEventListener('message', onMessage);
    ep.removeEventListener('error', onCrash);
    ep.removeEventListener('messageerror', onCrash);
    ep.terminate?.();
    ep.close?.();
  };

  function onCrash() {
    if (!endpoint) return;
    detach(endpoint);
    endpoint = null;
    crashes++;
    failAll(
      new ToolError(
        'WORKER_CRASHED',
        'The background worker stopped unexpectedly. Please try again.',
      ),
    );
    generation++;
    for (const listener of [...restartListeners]) listener();
  }

  const ensure = (): RpcEndpoint => {
    if (endpoint) return endpoint;
    if (crashes > maxRestarts) {
      throw new ToolError(
        'WORKER_CRASHED',
        'The background worker keeps crashing. Reload the page and try again.',
      );
    }
    const ep = connect();
    ep.addEventListener('message', onMessage);
    ep.addEventListener('error', onCrash);
    ep.addEventListener('messageerror', onCrash);
    endpoint = ep;
    return ep;
  };

  return {
    get generation() {
      return generation;
    },
    onRestart(listener) {
      restartListeners.add(listener);
      return () => restartListeners.delete(listener);
    },
    call(method, args, opts = {}) {
      return new Promise((resolve, reject) => {
        if (opts.signal?.aborted) {
          reject(new ToolError('CANCELLED', 'Cancelled'));
          return;
        }
        let target: RpcEndpoint;
        try {
          target = ensure();
        } catch (e) {
          reject(toToolError(e));
          return;
        }
        const id = nextId++;
        const onAbort = () => {
          if (!pending.delete(id)) return;
          target.postMessage({ type: 'abort', id } satisfies Request, []);
          reject(new ToolError('CANCELLED', 'Cancelled'));
        };
        opts.signal?.addEventListener('abort', onAbort, { once: true });
        pending.set(id, {
          resolve: resolve as (v: unknown) => void,
          reject,
          onProgress: opts.onProgress,
          cleanup: () => opts.signal?.removeEventListener('abort', onAbort),
        });
        try {
          target.postMessage(
            { type: 'call', id, method, args } satisfies Request,
            opts.transfer ?? [],
          );
        } catch (e) {
          const p = pending.get(id);
          pending.delete(id);
          p?.cleanup();
          reject(toToolError(e));
        }
      });
    },
    terminate() {
      if (endpoint) detach(endpoint);
      endpoint = null;
      failAll(new ToolError('CANCELLED', 'Worker terminated'));
    },
  };
}
