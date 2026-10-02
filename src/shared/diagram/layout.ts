/**
 * Ported from arshad-shah/verql src/renderer/src/components/er/layout.ts
 * (MIT, Copyright (c) 2026 Arshad Shah). Generalised from ERD tables to
 * typed record cards for src/shared/diagram.
 *
 * Layered layout: rank, order, place. A parent sits ahead of its children
 * along the rank axis, so a diagram reads parent to child. `direction`
 * chooses that axis: `LR` ranks flow left to right, `TB` top to bottom.
 * Disconnected components are laid out independently, then stacked along the
 * cross axis.
 *
 * When the edges form a forest (one parent per node, no cycles) the tree fast
 * path skips cycle breaking and crossing minimisation: rank is the depth and
 * the order is the DFS order, children sorted by the parent row they hang
 * from, so a document's keys read top to bottom in key order.
 */
import type { Card } from './metrics';
import type { DiagramEdge } from './model';

export type Direction = 'LR' | 'TB';

export interface LayoutOptions {
  /** Flow axis for ranks. */
  direction: Direction;
  /** Space between rank columns, along the rank axis. */
  rankGap: number;
  /** Space between cards inside a rank, along the cross axis. */
  nodeGap: number;
  /** Space between disconnected components, along the cross axis. */
  componentGap: number;
  /** Ordering refinement passes. */
  passes: number;
  /** Refinement stops once this much time has passed. */
  timeBudgetMs: number;
}

export const DEFAULT_LAYOUT: LayoutOptions = {
  direction: 'LR',
  rankGap: 96,
  nodeGap: 28,
  componentGap: 64,
  passes: 4,
  timeBudgetMs: 600,
};

export interface LayoutInfo {
  mode: 'tree' | 'layered';
  /** True when the time budget cut ordering passes short. */
  truncatedPasses: boolean;
}

interface Node {
  card: Card;
  rank: number;
  order: number;
  out: number[];
  in: number[];
}

/** Axis accessors: `along` is the rank axis, `cross` the perpendicular one. */
interface Axis {
  alongSize: (c: Card) => number;
  crossSize: (c: Card) => number;
  setAlong: (c: Card, v: number) => void;
  setCross: (c: Card, v: number) => void;
  getCross: (c: Card) => number;
}

function axisFor(dir: Direction): Axis {
  if (dir === 'LR') {
    return {
      alongSize: (c) => c.w,
      crossSize: (c) => c.h,
      setAlong: (c, v) => {
        c.x = v;
      },
      setCross: (c, v) => {
        c.y = v;
      },
      getCross: (c) => c.y,
    };
  }
  return {
    alongSize: (c) => c.h,
    crossSize: (c) => c.w,
    setAlong: (c, v) => {
      c.y = v;
    },
    setCross: (c, v) => {
      c.x = v;
    },
    getCross: (c) => c.x,
  };
}

const now = () => performance.now();

/** Lays the cards out in place (mutates `x` and `y`). */
export function layout(
  cards: Card[],
  edgesIn: DiagramEdge[],
  opts: Partial<LayoutOptions> = {},
): LayoutInfo {
  const o = { ...DEFAULT_LAYOUT, ...opts };
  const deadline = now() + o.timeBudgetMs;
  if (cards.length === 0) return { mode: 'tree', truncatedPasses: false };
  const ax = axisFor(o.direction);

  const idx = new Map<string, number>();
  cards.forEach((c, i) => idx.set(c.id, i));
  const nodes: Node[] = cards.map((card) => ({
    card,
    rank: 0,
    order: 0,
    out: [],
    in: [],
  }));

  // Edges run parent -> child. Self references carry no layout information.
  const edges: [number, number, number][] = [];
  const seen = new Set<string>();
  for (const e of edgesIn) {
    const a = idx.get(e.to);
    const b = idx.get(e.from);
    if (a === undefined || b === undefined || a === b) continue;
    const key = a + ':' + b;
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push([a, b, e.toRow ?? Number.MAX_SAFE_INTEGER]);
  }

  const dfs = treeOrder(nodes.length, edges);
  const mode: LayoutInfo['mode'] = dfs ? 'tree' : 'layered';
  let members: number[];
  if (dfs) {
    members = dfs.order;
    for (const [a, b] of dfs.sorted) {
      nodes[a].out.push(b);
      nodes[b].in.push(a);
    }
    for (let i = 0; i < nodes.length; i++) nodes[i].rank = dfs.depth[i];
  } else {
    members = nodes.map((_, i) => i);
    rankLayered(nodes, edges);
  }

  // --- components ---------------------------------------------------------
  const comp = new Int32Array(nodes.length).fill(-1);
  let nComp = 0;
  for (const s of members) {
    if (comp[s] !== -1) continue;
    const bfs = [s];
    comp[s] = nComp;
    for (let q = 0; q < bfs.length; q++) {
      const v = bfs[q];
      for (const list of [nodes[v].out, nodes[v].in]) {
        for (const w of list) {
          if (comp[w] === -1) {
            comp[w] = nComp;
            bfs.push(w);
          }
        }
      }
    }
    nComp++;
  }
  const groups: number[][] = Array.from({ length: nComp }, () => []);
  for (const i of members) groups[comp[i]].push(i);

  // Rank position is shared across components so ranks align globally.
  let maxRank = 0;
  for (const n of nodes) maxRank = Math.max(maxRank, n.rank);
  const colW = new Array<number>(maxRank + 1).fill(0);
  for (const n of nodes)
    colW[n.rank] = Math.max(colW[n.rank], ax.alongSize(n.card));
  const colX = new Array<number>(maxRank + 1).fill(0);
  for (let r = 1; r <= maxRank; r++)
    colX[r] = colX[r - 1] + colW[r - 1] + o.rankGap;

  let truncatedPasses = false;
  let cursorCross = 0;
  for (const group of groups) {
    let top = 0;
    const ranks: Node[][] = [];
    for (const i of group) {
      const n = nodes[i];
      top = Math.max(top, n.rank);
      (ranks[n.rank] ||= []).push(n);
    }
    for (let r = 0; r <= top; r++) ranks[r] ||= [];
    ranks.forEach((rank) => rank.forEach((n, i) => (n.order = i)));

    if (mode === 'layered' && !truncatedPasses)
      truncatedPasses = !order(nodes, ranks, o.passes, deadline);
    place(nodes, ranks, colX, colW, cursorCross, o.nodeGap, ax);

    let bottom = cursorCross;
    for (const i of group)
      bottom = Math.max(
        bottom,
        ax.getCross(nodes[i].card) + ax.crossSize(nodes[i].card),
      );
    cursorCross = bottom + o.componentGap;
  }

  // Snap to whole pixels. Cards are integer sized, so integer origins mean
  // every edge lands on a pixel boundary at zoom 1.
  for (const n of nodes) {
    n.card.x = Math.round(n.card.x);
    n.card.y = Math.round(n.card.y);
  }
  return { mode, truncatedPasses };
}

/**
 * The forest check plus DFS order. Null when a node has two parents or the
 * edges contain a cycle (some node is unreachable from every root).
 */
function treeOrder(
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
function rankLayered(nodes: Node[], edges: [number, number, number][]): void {
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
function order(
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

/**
 * Assign cross positions inside each rank, pulling nodes toward the mean of
 * their neighbours. `along` positions come straight from the rank columns.
 */
function place(
  all: Node[],
  ranks: Node[][],
  colX: number[],
  colW: number[],
  top: number,
  gap: number,
  ax: Axis,
): void {
  for (let r = 0; r < ranks.length; r++) {
    let c = top;
    for (const n of ranks[r]) {
      // Centre the card in its column so ranks of mixed sizes stay tidy.
      ax.setAlong(n.card, colX[r] + (colW[r] - ax.alongSize(n.card)) / 2);
      ax.setCross(n.card, c);
      c += ax.crossSize(n.card) + gap;
    }
  }

  for (let pass = 0; pass < 6; pass++) {
    const down = pass % 2 === 0;
    for (let k = 0; k < ranks.length; k++) {
      const rank = ranks[down ? k : ranks.length - 1 - k];
      if (rank.length === 0) continue;

      const want = rank.map((n) => {
        const ns = down ? n.in : n.out;
        if (!ns.length) return ax.getCross(n.card);
        let sum = 0;
        for (const i of ns)
          sum += ax.getCross(all[i].card) + ax.crossSize(all[i].card) / 2;
        return sum / ns.length - ax.crossSize(n.card) / 2;
      });

      // Restore minimum gaps, then recentre so the block does not drift a
      // little further on every iteration.
      const pos = want.slice();
      for (let i = 1; i < pos.length; i++) {
        pos[i] = Math.max(
          pos[i],
          pos[i - 1] + ax.crossSize(rank[i - 1].card) + gap,
        );
      }
      let drift = 0;
      for (let i = 0; i < pos.length; i++) drift += pos[i] - want[i];
      drift /= pos.length;
      for (let i = 0; i < pos.length; i++)
        ax.setCross(rank[i].card, pos[i] - drift);
    }
  }

  // Never let a component climb above its allotted band.
  let min = Infinity;
  for (const rank of ranks)
    for (const n of rank) min = Math.min(min, ax.getCross(n.card));
  if (min < top && min !== Infinity) {
    const d = top - min;
    for (const rank of ranks)
      for (const n of rank) ax.setCross(n.card, ax.getCross(n.card) + d);
  }
}
