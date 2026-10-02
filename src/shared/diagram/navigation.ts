/**
 * Keyboard navigation over a laid-out diagram (spec §6.8): reading order,
 * parent, first child and siblings, plus the text announced for a card.
 */
import type { Card } from './metrics';
import type { DiagramEdge, DiagramNode } from './model';

/** Card ids sorted top to bottom, then left to right. */
export function readingOrder(cards: Card[]): string[] {
  return cards
    .slice()
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .map((c) => c.id);
}

export function parentOf(edges: DiagramEdge[], id: string): string | null {
  for (const e of edges) if (e.from === id && e.to !== id) return e.to;
  return null;
}

/** Children of `id`, in the order of the parent rows they hang from. */
export function childrenOf(edges: DiagramEdge[], id: string): string[] {
  const kids = edges
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e.to === id && e.from !== id);
  kids.sort(
    (a, b) =>
      (a.e.toRow ?? Number.MAX_SAFE_INTEGER) -
        (b.e.toRow ?? Number.MAX_SAFE_INTEGER) || a.i - b.i,
  );
  return [...new Set(kids.map(({ e }) => e.from))];
}

/** The sibling `delta` steps away (-1 previous, 1 next), or null. */
export function siblingOf(
  edges: DiagramEdge[],
  id: string,
  delta: number,
): string | null {
  const parent = parentOf(edges, id);
  if (parent === null) return null;
  const sibs = childrenOf(edges, parent);
  const i = sibs.indexOf(id);
  return sibs[i + delta] ?? null;
}

/** "Object at $.store.book[2], 4 fields". */
export function describeNode(node: DiagramNode): string {
  const n = node.rows.length;
  const fields = `${n} ${n === 1 ? 'field' : 'fields'}`;
  if (!node.eyebrow) return `${node.title}, ${fields}`;
  const kind = node.eyebrow.charAt(0).toUpperCase() + node.eyebrow.slice(1);
  return `${kind} at ${node.title}, ${fields}`;
}
