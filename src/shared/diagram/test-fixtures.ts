/**
 * Shared test fixtures for the diagram suites (imported by *.test.ts only).
 * Seeded, so every run builds the same graphs.
 */
import { diagramFonts } from './fonts';
import type { Diagram, DiagramEdge, DiagramNode, RowKind } from './model';
import type { DiagramTheme } from './theme-bridge';

export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const rec = (
  id: string,
  rows: number,
  link: number[] = [],
): DiagramNode => ({
  id,
  eyebrow: 'object',
  title: id,
  rows: Array.from({ length: rows }, (_, i) =>
    link.includes(i)
      ? { key: `k${i}`, value: '2', kind: 'object', role: 'link' }
      : { key: `k${i}`, value: `v${i}`, kind: 'string' },
  ),
});

/** A random tree: every node but the root has one parent, fan-out 1..maxFan. */
export function randomTree(
  n: number,
  seed = 1,
  maxFan = 8,
  rowsPer = 4,
): Diagram {
  const r = rng(seed);
  const nodes: DiagramNode[] = [];
  const edges: DiagramEdge[] = [];
  const open: { node: DiagramNode; used: number; fan: number }[] = [];
  const add = (id: string) => {
    const fan = 1 + Math.floor(r() * maxFan);
    const node = rec(id, Math.max(rowsPer, fan), []);
    nodes.push(node);
    open.push({ node, used: 0, fan });
  };
  add('n0');
  let head = 0;
  for (let i = 1; i < n; i++) {
    while (open[head].used >= open[head].fan) head++;
    const p = open[head];
    const id = `n${i}`;
    edges.push({ id: `e${i}`, from: id, to: p.node.id, toRow: p.used });
    p.node.rows[p.used] = {
      key: `k${p.used}`,
      value: '1',
      kind: 'object',
      role: 'link',
    };
    p.used++;
    add(id);
  }
  return { nodes, edges };
}

/** A random DAG: edges only point from later nodes to earlier ones. */
export function randomDag(n: number, seed = 2, extra = 1.5): Diagram {
  const r = rng(seed);
  const nodes = Array.from({ length: n }, (_, i) => rec(`d${i}`, 3));
  const edges: DiagramEdge[] = [];
  let k = 0;
  for (let i = 1; i < n; i++) {
    const parents = 1 + Math.floor(r() * extra);
    for (let j = 0; j < parents; j++) {
      const p = Math.floor(r() * i);
      edges.push({ id: `x${k++}`, from: `d${i}`, to: `d${p}`, toRow: j % 3 });
    }
  }
  return { nodes, edges };
}

/** A theme whose colours are their role names, so draws are easy to find. */
export function testTheme(): DiagramTheme {
  const kinds: RowKind[] = [
    'string',
    'number',
    'boolean',
    'null',
    'object',
    'array',
    'element',
    'attribute',
    'text',
    'more',
  ];
  return {
    ...diagramFonts('monospace'),
    surface: 'surface',
    grid: 'grid',
    card: 'card',
    cardHeader: 'cardHeader',
    cardBorder: 'cardBorder',
    cardBorderStrong: 'cardBorderStrong',
    divider: 'divider',
    title: 'title',
    eyebrow: 'eyebrow',
    key: 'key',
    value: Object.fromEntries(kinds.map((k) => [k, `value-${k}`])) as Record<
      RowKind,
      string
    >,
    chip: 'chip',
    chipText: 'chipText',
    edge: 'edge',
    edgeMuted: 'edgeMuted',
    edgeActive: 'edgeActive',
    select: 'select',
    selectFill: 'selectFill',
    hoverFill: 'hoverFill',
    matchFill: 'matchFill',
  };
}
