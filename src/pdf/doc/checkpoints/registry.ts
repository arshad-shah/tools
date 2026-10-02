import { ToolError } from '@/shared/lib/errors';
import type { JobProgress } from '@/shared/state/useJob';
import type { Services } from '../services';
import type { AssetId, CheckpointReport, DocView } from '../types';

export interface CheckpointEnv {
  services: Services;
  signal: AbortSignal;
  progress(p: JobProgress): void;
}

export interface CheckpointInput<P> {
  /** The current view materialised: every pending change is in these bytes. */
  bytes: Uint8Array;
  params: P;
  assets: Record<AssetId, Uint8Array>;
  view: DocView;
}

export interface CheckpointOutput {
  bytes: Uint8Array;
  report: CheckpointReport;
}

/** Main-thread orchestrator of one checkpoint op (decision G5). */
export interface CheckpointRunner<P = unknown> {
  type: string;
  run(input: CheckpointInput<P>, env: CheckpointEnv): Promise<CheckpointOutput>;
}

export function defineCheckpointRunner<P>(
  r: CheckpointRunner<P>,
): CheckpointRunner<P> {
  return r;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const runners = new Map<string, CheckpointRunner<any>>();

export function registerCheckpointRunners(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rs: readonly CheckpointRunner<any>[],
): void {
  for (const r of rs) {
    const known = runners.get(r.type);
    if (known === r) continue;
    if (known)
      throw new Error(
        `A checkpoint runner for ${r.type} is already registered`,
      );
    runners.set(r.type, r);
  }
}

export function getCheckpointRunner(type: string): CheckpointRunner {
  const r = runners.get(type);
  if (!r)
    throw new ToolError(
      'INVALID_INPUT',
      `This version cannot run the ${type} step`,
    );
  return r;
}
