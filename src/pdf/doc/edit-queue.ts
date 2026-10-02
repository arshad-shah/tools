import type {
  CallOptions,
  RpcClient,
  RpcHandlers,
} from '@/shared/lib/worker-rpc';
import { createSlotLimiter } from '@/pdf/render/scheduling';

/**
 * The edit worker runs one job at a time (spec §6.7): calls queue behind a
 * one-slot limiter, and a caller's abort leaves the queue or stops the job.
 * A cancelled job rejects its caller at once but keeps the slot until the
 * worker has actually stopped, so the next job never runs beside it.
 */
export function serialised<H extends RpcHandlers>(
  client: RpcClient<H>,
): RpcClient<H> {
  const withSlot = createSlotLimiter(1);
  return {
    call: (method, args, opts: CallOptions = {}) =>
      new Promise((resolve, reject) => {
        withSlot(
          () =>
            new Promise<void>((settled) => {
              client
                .call(method, args, {
                  ...opts,
                  onSettled() {
                    settled();
                    opts.onSettled?.();
                  },
                })
                .then((value) => {
                  settled(); // a reply means the worker is done
                  resolve(value);
                }, reject);
            }),
          opts.signal,
        ).catch(reject);
      }),
    terminate: () => client.terminate(),
    get generation() {
      return client.generation;
    },
    onRestart: (l) => client.onRestart(l),
  };
}
