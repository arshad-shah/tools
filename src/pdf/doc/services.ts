import type { JobProgress } from '@/shared/state/useJob';
import { createRpcClient, type RpcClient } from '@/shared/lib/worker-rpc';
import { browserCompressDeps } from '@/pdf/compress/client';
import type { CompressDeps } from '@/pdf/compress/pipeline';
import { qpdf, type createQpdf } from '@/pdf/qpdf/client';
import { pdfRender, type PdfRender } from '@/pdf/render/client';
import type { EditHandlers } from '@/pdf/edit/worker/handlers';
import { serialised } from './edit-queue';
import type {
  MaterializePlan,
  MaterializeResult,
} from './materialize/materialize';

export type { BlobSource } from './blob-store';
export { planFor } from './plan';

/** Main-thread clients of every worker the workspace uses (spec §6.7). */
export interface Services {
  edit: RpcClient<EditHandlers>;
  render: PdfRender;
  qpdf: ReturnType<typeof createQpdf>;
  compress: CompressDeps;
}

let services: Services | null = null;

/** Lazily constructed singletons; workers start on first use. */
export function getServices(): Services {
  services ??= {
    edit: serialised(
      createRpcClient<EditHandlers>(
        () =>
          new Worker(new URL('../edit/edit.worker.ts', import.meta.url), {
            type: 'module',
          }),
      ),
    ),
    render: pdfRender,
    qpdf,
    compress: browserCompressDeps,
  };
  return services;
}

/** Copies every buffer of a plan so the caller's bytes stay usable after transfer. */
function transferable(plan: MaterializePlan) {
  const copy = (b: Uint8Array) => b.slice();
  const out: MaterializePlan = {
    ...plan,
    base: copy(plan.base),
    sources: Object.fromEntries(
      Object.entries(plan.sources).map(([k, v]) => [k, copy(v)]),
    ),
    assets: Object.fromEntries(
      Object.entries(plan.assets).map(([k, v]) => [k, copy(v)]),
    ),
  };
  const transfer = [
    out.base.buffer,
    ...Object.values(out.sources).map((b) => b.buffer),
    ...Object.values(out.assets).map((b) => b.buffer),
  ] as ArrayBuffer[];
  return { plan: out, transfer: [...new Set(transfer)] };
}

/** Runs materialise in the edit worker. */
export function materializeIn(
  services: Pick<Services, 'edit'>,
  plan: MaterializePlan,
  opts: { signal?: AbortSignal; progress?: (p: JobProgress) => void } = {},
): Promise<MaterializeResult> {
  const { plan: sent, transfer } = transferable(plan);
  return services.edit.call('materialize', [sent], {
    signal: opts.signal,
    transfer,
    onProgress: opts.progress,
  });
}
