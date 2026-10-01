import { createRpcClient } from '@/shared/lib/worker-rpc';
import { qpdf } from '@/pdf/qpdf';
import type { CompressHandlers } from './compress.worker';
import type { CompressDeps } from './pipeline';

const client = createRpcClient<CompressHandlers>(
  () =>
    new Worker(new URL('./compress.worker.ts', import.meta.url), {
      type: 'module',
    }),
);

/** Stage 1 in the compress worker, stage 2 in the qpdf worker. */
export const browserCompressDeps: CompressDeps = {
  prepare(bytes, opts, ctx) {
    const copy = bytes.slice();
    return client.call('prepare', [copy, opts], {
      signal: ctx.signal,
      transfer: [copy.buffer],
      onProgress: ctx.progress,
    });
  },
  optimize: (bytes, options, signal) => qpdf.optimize(bytes, options, signal),
};
