import { useEffect, useRef } from 'react';
import type { KillableClient } from '@/shared/lib/killable-client';
import type { TextHandlers } from '@/shared/workers/handlers';
import type { KdfParams } from '@/shared/lib/crypto/aead';
import type { RpcEndpoint } from '@/shared/lib/worker-rpc';
import { useJob } from '@/shared/state/useJob';
import { createTextWorker } from '@/shared/workers/text-client';

export interface CryptoJobOptions {
  /** Test seam: an in-process endpoint instead of a real worker. */
  connect?: () => RpcEndpoint;
}

/**
 * Seal and open jobs on a dedicated text worker (spec §9.5): Argon2id runs
 * off the main thread, Cancel kills only this tool's worker, and the
 * worker is terminated on unmount.
 */
export function useCryptoJob({ connect }: CryptoJobOptions = {}) {
  // Created on first use and dropped on unmount, so StrictMode's
  // unmount-remount never leaves a terminated worker behind.
  const ref = useRef<KillableClient<TextHandlers> | null>(null);
  const worker = () => (ref.current ??= createTextWorker({ connect }));
  useEffect(
    () => () => {
      ref.current?.terminate();
      ref.current = null;
    },
    [],
  );

  const sealJob = useJob(
    (ctx, plain: Uint8Array, passphrase: string, kdf: KdfParams) =>
      worker().call('crypto.seal', [plain, passphrase, kdf], {
        signal: ctx.signal,
        onProgress: ctx.progress,
      }),
  );
  const openJob = useJob((ctx, sealed: Uint8Array, passphrase: string) =>
    worker().call('crypto.open', [sealed, passphrase], {
      signal: ctx.signal,
      onProgress: ctx.progress,
    }),
  );
  return { sealJob, openJob };
}
