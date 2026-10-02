import { OCR_RUNNERS } from './ocr';
import { redactApplyRunner } from './redact';
import { optimizeCompressRunner, optimizeRepairRunner } from './optimize';
import { registerCheckpointRunners, type CheckpointRunner } from './registry';
import { sanitizeRunner } from './sanitize';

/** Every checkpoint runner. Append-only: later Parts add one spread each. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ALL_RUNNERS: readonly CheckpointRunner<any>[] = [
  ...OCR_RUNNERS,
  redactApplyRunner,
  sanitizeRunner,
  optimizeCompressRunner,
  optimizeRepairRunner,
];

/** Registers every runner on the main thread (where checkpoints run, G5). */
export function registerCoreRunners(): void {
  registerCheckpointRunners(ALL_RUNNERS);
}
