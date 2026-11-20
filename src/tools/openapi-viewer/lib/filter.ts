import type { Operation, TagGroup } from './api';

const haystack = (op: Operation) =>
  [op.method, op.path, op.summary, op.operationId, op.description, ...op.tags]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

/**
 * The groups with only the operations every word of `query` appears in
 * (method, path, summary, operationId, description or tags). A word that
 * names a method (`get`, `POST`) matches that method only.
 */
export function filterGroups(groups: TagGroup[], query: string): TagGroup[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return groups;
  const methods = new Set(
    groups.flatMap((g) => g.operations.map((o) => o.method.toLowerCase())),
  );
  return groups
    .map((g) => ({
      ...g,
      operations: g.operations.filter((op) => {
        const text = haystack(op);
        return words.every((w) =>
          methods.has(w) ? op.method.toLowerCase() === w : text.includes(w),
        );
      }),
    }))
    .filter((g) => g.operations.length);
}
