import { OCR_RUNNERS } from './ocr';
import type { CheckpointRunner } from './registry';

/** Every checkpoint runner. Append-only: later Parts add one spread each. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ALL_RUNNERS: readonly CheckpointRunner<any>[] = [...OCR_RUNNERS];
