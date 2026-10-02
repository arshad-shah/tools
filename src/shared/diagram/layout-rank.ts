/**
 * Ported from arshad-shah/verql src/renderer/src/components/er/layout.ts
 * (MIT, Copyright (c) 2026 Arshad Shah). Generalised from ERD tables to
 * typed record cards for src/shared/diagram.
 *
 * Rank and order for the layered layout: the forest check (tree fast path),
 * cycle breaking, longest-path ranking and median/transpose ordering.
 */
import type { Card } from './metrics';

export interface Node {
  card: Card;
  rank: number;
  order: number;
  out: number[];
  in: number[];
}

const now = () => performance.now();

/**
 * The forest check plus DFS order. Null when a node has two parents or the
 * edges contain a cycle (some node is unreachable from every root).
 */
export function treeOrder(
  n: number,
  edges: [number, number, number][],
): { order: number[]; depth: Int32Array; sorted: [number, number][] } | null {
  const parent = new Int32Array(n).fill(-1);
  const kids: [number, number][][] = Array.from({ length: n }, () => []);
  for (const [a, b, row] of edges) {
    if (parent[b] !== -1) return null;
    parent[b] = a;
    kids[a].push([row, b]);
  }
  // Stable: equal rows keep edge order.
  for (const k of kids) if (k.length > 1) k.sort((x, y) => x[0] - y[0]);

  const order: number[] = [];
  const depth = new Int32Array(n);
  const sorted: [number, number][] = [];
  const stack: number[] = [];
  for (let root = 0; root < n; root++) {
    if (parent[root] !== -1) continue;
    stack.push(root);
    while (stack.length) {
      const v = stack.pop()!;
      order.push(v);
      const k = kids[v];
      for (let i = k.length - 1; i >= 0; i--) {
        const c = k[i][1];
        depth[c] = depth[v] + 1;
        stack.push(c);
      }
      for (const [, c] of k) sorted.push([v, c]);
    }
  }
  return order.length === n ? { order, depth, sorted } : null;
}

/** Cycle break (back edges ignored for ranking), then longest-path rank. */
export function rankLayered(
  nodes: Node[],
  edges: [number, number, number][],
): void {
  const adj: number[][] = nodes.map(() => []);
  for (const [a, b] of edges) adj[a].push(b);

  // A back edge found during DFS is dropped from the ranking graph only; it
  // is still drawn, it just gets no say in which column things land in.
  const state = new Uint8Array(nodes.length); // 0 unseen, 1 on stack, 2 done
  const acyclic: [number, number][] = [];
  const stack: number[] = [];
  const iter: number[] = [];
  for (let s = 0; s < nodes.length; s++) {
    if (state[s]) continue;
    stack.push(s);
    iter.push(0);
    while (stack.length) {
      const v = stack[stack.length - 1];
      state[v] = 1;
      const i = iter[iter.length - 1]++;
      if (i >= adj[v].length) {
        state[v] = 2;
        stack.pop();
        iter.pop();
        continue;
      }
      const w = adj[v][i];
      if (state[w] === 1) continue;
      acyclic.push([v, w]);
      if (state[w] === 0) {
        stack.push(w);
        iter.push(0);
      }
    }
  }
  for (const [a, b] of acyclic) {
    nodes[a].out.push(b);
    nodes[b].in.push(a);
  }

  // Longest path from every source. Kahn order guarantees parents first.
  const indeg = nodes.map((n) => n.in.length);
  const queue: number[] = [];
  for (let i = 0; i < nodes.length; i++) if (indeg[i] === 0) queue.push(i);
  for (let q = 0; q < queue.length; q++) {
    const v = queue[q];
    for (const w of nodes[v].out) {
      if (nodes[v].rank + 1 > nodes[w].rank) nodes[w].rank = nodes[v].rank + 1;
      if (--indeg[w] === 0) queue.push(w);
    }
  }
}

/**
 * Median heuristic with a transpose pass, swept both directions. Returns
 * false when the deadline cut the passes short.
 */
export function order(
  all: Node[],
  ranks: Node[][],
  passes: number,
  deadline: number,
): boolean {
  for (let p = 0; p < passes; p++) {
    const down = p % 2 === 0;
    for (let k = 0; k < ranks.length; k++) {
      if (now() > deadline) return false;
      const r = down ? k : ranks.length - 1 - k;
      const fixed = down ? r - 1 : r + 1;
      if (fixed < 0 || fixed >= ranks.length || ranks[fixed].length === 0)
        continue;

      const pos = new Map<Node, number>();
      ranks[fixed].forEach((n, i) => pos.set(n, i));

      const key = new Map<Node, number>();
      for (const n of ranks[r]) {
        const near: number[] = [];
        for (const i of down ? n.in : n.out) {
          const at = pos.get(all[i]);
          if (at !== undefined) near.push(at);
        }
        key.set(n, near.length ? median(near) : Number.MAX_SAFE_INTEGER);
      }

      ranks[r].sort((a, b) => key.get(a)! - key.get(b)! || a.order - b.order);
      transpose(all, ranks, r, fixed);
      ranks[r].forEach((n, i) => (n.order = i));
    }
  }
  return true;
}

/** Swap adjacent pairs while it strictly reduces crossings against `fixed`. */
function transpose(all: Node[], ranks: Node[][], r: number, fixed: number) {
  const pos = new Map<Node, number>();
  ranks[fixed].forEach((n, i) => pos.set(n, i));
  const links = (n: Node): number[] => {
    const out: number[] = [];
    for (const i of fixed < r ? n.in : n.out) {
      const at = pos.get(all[i]);
      if (at !== undefined) out.push(at);
    }
    return out;
  };

  let improved = true;
  let guard = 0;
  while (improved && guard++ < 8) {
    improved = false;
    for (let i = 0; i + 1 < ranks[r].length; i++) {
      const a = links(ranks[r][i]);
      const b = links(ranks[r][i + 1]);
      if (cross(a, b) > cross(b, a)) {
        const t = ranks[r][i];
        ranks[r][i] = ranks[r][i + 1];
        ranks[r][i + 1] = t;
        improved = true;
      }
    }
  }
}

function cross(a: number[], b: number[]): number {
  let n = 0;
  for (const x of a) for (const y of b) if (x > y) n++;
  return n;
}

function median(v: number[]): number {
  const s = v.slice().sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
