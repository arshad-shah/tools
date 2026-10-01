import type { EncryptOptions, OptimizeOptions } from '@arshad-shah/qpdf-wasm';
import { createRpcClient } from '@/shared/lib/worker-rpc';
import type { QpdfHandlers } from './handlers';

const client = createRpcClient<QpdfHandlers>(
  () =>
    new Worker(new URL('./qpdf.worker.ts', import.meta.url), {
      type: 'module',
    }),
);

/** Callers keep their bytes: a copy is transferred to the worker. */
const send = (bytes: Uint8Array) => {
  const copy = bytes.slice();
  return { copy, transfer: [copy.buffer] };
};

export const qpdf = {
  inspect(bytes: Uint8Array, password?: string, signal?: AbortSignal) {
    const { copy, transfer } = send(bytes);
    return client.call('inspect', [copy, password], { signal, transfer });
  },
  optimize(bytes: Uint8Array, options: OptimizeOptions, signal?: AbortSignal) {
    const { copy, transfer } = send(bytes);
    return client.call('optimize', [copy, options], { signal, transfer });
  },
  encrypt(bytes: Uint8Array, options: EncryptOptions, signal?: AbortSignal) {
    const { copy, transfer } = send(bytes);
    return client.call('encrypt', [copy, options], { signal, transfer });
  },
  decrypt(bytes: Uint8Array, password: string, signal?: AbortSignal) {
    const { copy, transfer } = send(bytes);
    return client.call('decrypt', [copy, password], { signal, transfer });
  },
};
