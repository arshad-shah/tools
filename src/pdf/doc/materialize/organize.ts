import type { Materializer } from './registry';

/**
 * Organize ops are all structure ops: materialise builds the page order,
 * rotation, boxes and labels from the plan's page map (merged-in pages come
 * from `plan.sources`), so no overlay writers are needed.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ORGANIZE_MATERIALIZERS: readonly Materializer<any>[] = [];
