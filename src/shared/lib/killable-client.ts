import { ToolError } from './errors';
import {
  createRpcClient,
  type CallOptions,
  type RpcClient,
  type RpcEndpoint,
  type RpcHandlers,
  type Transferred,
} from './worker-rpc';

type Args<F> = F extends (ctx: never, ...args: infer A) => unknown ? A : never;
type Result<F> = F extends (...a: never[]) => infer R
  ? Awaited<R> extends Transferred<infer V>
    ? V
    : Awaited<R>
  : never;

export interface KillableCallOptions extends CallOptions {
  timeoutMs?: number;
  timeoutMessage?: string;
}

export interface KillableClient<H extends RpcHandlers> {
  call<K extends keyof H & string>(
    method: K,
    args: Args<H[K]>,
    opts?: KillableCallOptions,
  ): Promise<Result<H[K]>>;
  terminate(): void;
}

/**
 * For work that cannot be interrupted from inside (a backtracking regex, a
 * synchronous wasm call): on timeout, or on abort while running, the worker
 * is terminated and the next call starts a fresh one. Generalises the
 * restart pattern in pdf/qpdf/client.ts.
 */
export function createKillableClient<H extends RpcHandlers>(
  connect: () => RpcEndpoint,
  defaults: {
    timeoutMs?: number;
    /**
     * false: a timeout or abort cancels only that call (the handler sees its
     * signal) and the worker lives on, for a worker other jobs share.
     */
    kill?: boolean;
  } = {},
): KillableClient<H> {
  const kill = defaults.kill ?? true;
  let client: RpcClient<H> = createRpcClient<H>(connect);
  const replace = (owner: RpcClient<H>) => {
    if (client !== owner) return;
    owner.terminate();
    client = createRpcClient<H>(connect);
  };

  return {
    call(method, args, opts = {}) {
      const owner = client;
      const timeoutMs = opts.timeoutMs ?? defaults.timeoutMs;
      let settled = false;
      // Without killing, a timeout cancels the call through its own signal.
      const own = kill ? null : new AbortController();
      const onAbort = () => {
        if (settled) return;
        if (own) own.abort();
        else replace(owner);
      };
      if (opts.signal?.aborted) own?.abort();
      else opts.signal?.addEventListener('abort', onAbort, { once: true });
      const callOpts = own ? { ...opts, signal: own.signal } : opts;
      const work = owner.call(method, args as never, callOpts) as Promise<
        Result<H[typeof method]>
      >;
      const timed =
        timeoutMs === undefined
          ? work
          : new Promise<Result<H[typeof method]>>((resolve, reject) => {
              const timer = setTimeout(() => {
                if (settled) return;
                if (own) own.abort();
                else replace(owner);
                reject(
                  new ToolError(
                    'TIMEOUT',
                    opts.timeoutMessage ??
                      `This took longer than ${timeoutMs / 1000} s and was stopped`,
                  ),
                );
              }, timeoutMs);
              work.then(
                (v) => {
                  clearTimeout(timer);
                  resolve(v);
                },
                (e: unknown) => {
                  clearTimeout(timer);
                  reject(e);
                },
              );
            });
      return timed.finally(() => {
        settled = true;
        opts.signal?.removeEventListener('abort', onAbort);
      });
    },
    terminate() {
      client.terminate();
    },
  };
}
