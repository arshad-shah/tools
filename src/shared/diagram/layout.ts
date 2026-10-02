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
import { order, rankLayered, treeOrder, type Node } from './layout-rank';

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

/** Lays the cards out in place (mutates `x` and `y`). */
export function layout(
  cards: Card[],
  edgesIn: DiagramEdge[],
  opts: Partial<LayoutOptions> = {},
): LayoutInfo {
  const o = { ...DEFAULT_LAYOUT, ...opts };
  const deadline = performance.now() + o.timeBudgetMs;
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
