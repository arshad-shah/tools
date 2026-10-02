import type { EncryptOptions, OptimizeOptions } from '@arshad-shah/qpdf-wasm';
import {
  createRpcClient,
  type RpcClient,
  type RpcEndpoint,
} from '@/shared/lib/worker-rpc';
import type { QpdfHandlers } from './handlers';

/** Callers keep their bytes: a copy is transferred to the worker. */
const send = (bytes: Uint8Array) => {
  const copy = bytes.slice();
  return { copy, transfer: [copy.buffer] };
};

/**
 * The qpdf API over a worker. qpdf calls are synchronous wasm, so an abort
 * cannot interrupt one: when a call is cancelled while the worker is running
 * it, the worker is terminated and the next call starts a fresh one (the
 * worker holds no state). Other calls in flight on the old worker then fail
 * as cancelled too.
 */
export function createQpdf(connect: () => RpcEndpoint) {
  let client: RpcClient<QpdfHandlers> = createRpcClient(connect);

  function call<K extends keyof QpdfHandlers & string>(
    method: K,
    args: unknown[],
    transfer: Transferable[],
    signal?: AbortSignal,
  ) {
    const owner = client;
    let settled = false;
    const restart = () => {
      if (settled || client !== owner) return;
      owner.terminate();
      client = createRpcClient(connect);
    };
    if (!signal?.aborted)
      signal?.addEventListener('abort', restart, { once: true });
    return owner
      .call(method, args as never, { signal, transfer })
      .finally(() => {
        settled = true;
        signal?.removeEventListener('abort', restart);
      });
  }

  return {
    inspect(bytes: Uint8Array, password?: string, signal?: AbortSignal) {
      const { copy, transfer } = send(bytes);
      return call('inspect', [copy, password], transfer, signal);
    },
    optimize(
      bytes: Uint8Array,
      options: OptimizeOptions,
      signal?: AbortSignal,
    ) {
      const { copy, transfer } = send(bytes);
      return call('optimize', [copy, options], transfer, signal);
    },
    encrypt(bytes: Uint8Array, options: EncryptOptions, signal?: AbortSignal) {
      const { copy, transfer } = send(bytes);
      return call('encrypt', [copy, options], transfer, signal);
    },
    decrypt(bytes: Uint8Array, password: string, signal?: AbortSignal) {
      const { copy, transfer } = send(bytes);
      return call('decrypt', [copy, password], transfer, signal);
    },
    /** QDF (uncompressed, no object streams) for raw-byte inspection. */
    qdf(bytes: Uint8Array, signal?: AbortSignal) {
      const { copy, transfer } = send(bytes);
      return call('qdf', [copy], transfer, signal);
    },
    passwordRole(bytes: Uint8Array, password: string, signal?: AbortSignal) {
      const { copy, transfer } = send(bytes);
      return call('passwordRole', [copy, password], transfer, signal);
    },
  };
}

export const qpdf = createQpdf(
  () =>
    new Worker(new URL('./qpdf.worker.ts', import.meta.url), {
      type: 'module',
    }),
);
