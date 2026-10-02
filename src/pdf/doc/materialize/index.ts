import { ORGANIZE_MATERIALIZERS } from './organize';
import type { Materializer } from './registry';

/** Every overlay writer. Append-only: later Parts add one spread each. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ALL_MATERIALIZERS: readonly Materializer<any>[] = [
  ...ORGANIZE_MATERIALIZERS,
];
