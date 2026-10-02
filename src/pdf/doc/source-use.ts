import type { CheckpointMeta, Operation, SourceId } from './types';

/** Structure ops that bring their own source file (dropped with them). */
export const SOURCE_OPS = new Set(['page.mergeIn', 'page.insertImages']);

/** The source an op brought in, if it is a source op. */
export const sourceOf = (o: Operation): SourceId | undefined =>
  SOURCE_OPS.has(o.type)
    ? (o.params as { sourceId: SourceId }).sourceId
    : undefined;

/** Whether a checkpoint or an op in the log uses the source. */
export const sourceInUse = (
  id: SourceId,
  log: readonly Operation[],
  checkpoints: readonly CheckpointMeta[],
) =>
  checkpoints.some((c) => c.sourceId === id) ||
  log.some((o) => sourceOf(o) === id);
