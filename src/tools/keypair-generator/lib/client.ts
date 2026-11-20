import { ToolError } from '@/shared/lib/errors';
import {
  createRpcClient,
  type RpcClient,
  type RpcEndpoint,
} from '@/shared/lib/worker-rpc';
import { generateKeyMaterial, type KeyMaterial } from './generate';
import type { KeypairHandlers } from './handlers';
import type { KeySpec } from './spec';

/**
 * Generates off the main thread: RSA 4096 can take seconds, and some
 * browsers do part of it synchronously. Cancelling terminates the worker
 * (WebCrypto cannot be interrupted) and the next call starts a fresh one.
 * Without Worker support (tests) it runs here.
 */
export function createKeypairClient(connect: (() => RpcEndpoint) | null) {
  let client: RpcClient<KeypairHandlers> | null = connect
    ? createRpcClient<KeypairHandlers>(connect)
    : null;

  return {
    async generate(spec: KeySpec, signal?: AbortSignal): Promise<KeyMaterial> {
      if (signal?.aborted) throw new ToolError('CANCELLED', 'Cancelled');
      if (!client || !connect) return generateKeyMaterial(spec);
      const owner = client;
      const kill = () => {
        if (client !== owner) return;
        owner.terminate();
        client = createRpcClient<KeypairHandlers>(connect);
      };
      signal?.addEventListener('abort', kill, { once: true });
      try {
        return await owner.call('generate', [spec], { signal });
      } finally {
        signal?.removeEventListener('abort', kill);
      }
    },
    terminate() {
      client?.terminate();
    },
  };
}

export type KeypairClient = ReturnType<typeof createKeypairClient>;

let shared: KeypairClient | null = null;

/** The shared key worker client, created on first use. */
export function keypairClient(): KeypairClient {
  shared ??= createKeypairClient(
    typeof Worker === 'undefined'
      ? null
      : () =>
          new Worker(new URL('./keypair.worker.ts', import.meta.url), {
            type: 'module',
            name: 'keypair-generator',
          }) as unknown as RpcEndpoint,
  );
  return shared;
}
