/**
 * Adds `added` to `list`, each before the first item (in list order) that
 * was dropped after it, else at the end. Files from a new drop append; a
 * file unlocked later goes back where it was dropped among its siblings.
 */
export function insertByOrder<T extends { order: number }>(
  list: readonly T[],
  added: readonly T[],
): T[] {
  const out = [...list];
  for (const item of [...added].sort((a, b) => a.order - b.order)) {
    const at = out.findIndex((x) => x.order > item.order);
    if (at < 0) out.push(item);
    else out.splice(at, 0, item);
  }
  return out;
}
