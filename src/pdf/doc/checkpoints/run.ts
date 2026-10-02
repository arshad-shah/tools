import { ToolError } from '@/shared/lib/errors';
import { newId as defaultId } from '@/shared/lib/id';
import type { JobProgress } from '@/shared/state/useJob';
import type { BlobStore } from '../blob-store';
import type { DocumentModel } from '../model';
import { planFor } from '../plan';
import { getOperation } from '../registry';
import { materializeIn, type Services } from '../services';
import type { CheckpointReport, OpId, PageGeom, SourceRef } from '../types';
import { getCheckpointRunner, type CheckpointRunner } from './registry';

export interface RunCheckpointArgs<P> {
  model: DocumentModel;
  blobs: BlobStore;
  services: Services;
  type: string;
  params: P;
  signal: AbortSignal;
  progress(p: JobProgress): void;
  /** Page geometry of the new bytes (the workspace opens them in the render worker). */
  inspect(bytes: Uint8Array, signal: AbortSignal): Promise<PageGeom[]>;
  now?: () => number;
  newId?: () => string;
  /** Overlay ops the checkpoint replaces: left out of the materialised view. */
  exclude?: readonly OpId[];
}

/**
 * Runs a checkpoint op (spec §6.2, decision G5): materialises the current
 * view, hands the bytes to the op's runner, then commits the result as the
 * new base. The model is busy meanwhile (no edits, undo or redo). Nothing is
 * committed if any step fails or is cancelled, or if the history changed.
 */
export async function runCheckpoint<P>(
  a: RunCheckpointArgs<P>,
): Promise<CheckpointReport> {
  const def = getOperation(a.type);
  if (def.kind !== 'checkpoint')
    throw new ToolError('INVALID_INPUT', `${a.type} is not a checkpoint`);
  const params = def.validate(a.params);
  const runner = getCheckpointRunner(a.type);
  const end = a.model.beginJob();
  try {
    return await run(a, params, runner);
  } finally {
    end();
  }
}

async function run<P>(
  a: RunCheckpointArgs<P>,
  params: unknown,
  runner: CheckpointRunner,
): Promise<CheckpointReport> {
  const { model, blobs, services, signal, progress } = a;
  const before = model.getState();
  const plan = await planFor(model, blobs, { excludeOverlays: a.exclude });
  const view = model.getView();
  const { bytes } = await materializeIn(services, plan, { signal, progress });
  const out = await runner.run(
    { bytes, params, assets: plan.assets, view },
    { services, signal, progress },
  );
  const pages = await a.inspect(out.bytes, signal);
  if (signal.aborted) throw new ToolError('CANCELLED', 'Cancelled');
  const now = model.getState();
  if (now.log !== before.log || now.cursor !== before.cursor)
    throw new ToolError(
      'CANCELLED',
      'The document changed while this was running, so nothing was applied',
    );
  const id = a.newId ?? defaultId;
  const source: SourceRef = {
    id: id(),
    name: model.getState().name,
    byteSize: out.bytes.byteLength,
    pageCount: pages.length,
    pages,
    origin: 'checkpoint',
  };
  const previous = model.currentCheckpoint();
  model.commitCheckpoint(
    { type: a.type, params },
    {
      id: id(),
      sourceId: source.id,
      byteSize: source.byteSize,
      pageCount: source.pageCount,
      createdAt: (a.now ?? Date.now)(),
      report: out.report,
    },
    source,
  );
  const current = model.currentCheckpoint();
  // After commitCheckpoint: its `dropped` event has already freed reused keys.
  blobs.addCheckpoint(current, out.bytes);
  blobs.keepInMemory(current.id, previous.id);
  return out.report;
}
