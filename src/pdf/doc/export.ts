import { ToolError } from '@/shared/lib/errors';
import type { JobProgress } from '@/shared/state/useJob';
import type { BlobSource } from './blob-store';
import {
  EXPORT_STAGES,
  type ExportContext,
  type ExportOptions,
} from './export-stages';
import type { DocumentModel } from './model';
import { planFor } from './plan';
import { assertUnrestricted } from './restricted';
import { materializeIn, type Services } from './services';

/**
 * Writes the document as it is now (spec §6.4): materialise in the edit
 * worker, then every applicable export stage in order. Throws ToolError;
 * never returns partial output.
 */
export async function exportDocument(
  model: DocumentModel,
  blobs: BlobSource,
  options: ExportOptions,
  env: {
    services: Services;
    signal: AbortSignal;
    progress(p: JobProgress): void;
  },
): Promise<{ bytes: Uint8Array; warnings: string[]; notes: string[] }> {
  assertUnrestricted(model.getState());
  const cancelled = () => new ToolError('CANCELLED', 'Cancelled');
  const plan = await planFor(model, blobs, {
    onlyPages: options.onlyPages ?? undefined,
  });
  if (plan.pages.length === 0)
    throw new ToolError('INVALID_INPUT', 'There are no pages to export');
  const result = await materializeIn(env.services, plan, {
    signal: env.signal,
    progress: env.progress,
  });
  const ctx: ExportContext = {
    model,
    view: model.getView(),
    options,
    services: env.services,
    signal: env.signal,
    progress: env.progress,
    warnings: [],
  };
  let bytes = result.bytes;
  const stages = [...EXPORT_STAGES]
    .sort((a, b) => a.order - b.order)
    .filter((s) => s.applies(ctx));
  for (const [i, stage] of stages.entries()) {
    if (env.signal.aborted) throw cancelled();
    env.progress({ done: i, total: stages.length, label: stage.id });
    bytes = await stage.run(bytes, ctx);
  }
  if (env.signal.aborted) throw cancelled();
  return { bytes, warnings: ctx.warnings, notes: result.notes };
}
