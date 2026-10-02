// Test-only: Services whose edit client runs materialise in-process.
import { Transferred, type RpcClient } from '@/shared/lib/worker-rpc';
import type { EditHandlers } from '@/pdf/edit/worker/handlers';
import { stripMetadata } from '@/pdf/edit/metadata';
import { signHandlers } from '@/pdf/edit/worker/sign';
import { materialize } from './materialize/materialize';
import type { Services } from './services';

export function inProcessServices(patch: Partial<Services> = {}): Services {
  const edit = {
    async call(
      method: string,
      args: unknown[],
      opts: { signal?: AbortSignal; onProgress?: (p: unknown) => void } = {},
    ) {
      if (method === 'stripMetadata')
        return stripMetadata(args[0] as Uint8Array);
      if (method in signHandlers) {
        const out = await (
          signHandlers as unknown as Record<
            string,
            (...a: unknown[]) => Promise<unknown>
          >
        )[method](null, ...args);
        // Unwrap Transferred results the way the RPC layer does.
        return out instanceof Transferred ? out.value : out;
      }
      return materialize(args[0] as never, {
        signal: opts.signal ?? new AbortController().signal,
        progress: (p) => opts.onProgress?.(p),
      });
    },
    terminate() {},
    generation: 0,
    onRestart: () => () => {},
  } as unknown as RpcClient<EditHandlers>;
  return {
    edit,
    render: {} as Services['render'],
    qpdf: {} as Services['qpdf'],
    compress: {} as Services['compress'],
    ocr: {} as Services['ocr'],
    ...patch,
  };
}
