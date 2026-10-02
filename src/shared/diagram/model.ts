/**
 * Ported from arshad-shah/verql src/renderer/src/components/er/model.ts
 * (MIT, Copyright (c) 2026 Arshad Shah). Generalised from ERD tables to
 * typed record cards for src/shared/diagram.
 *
 * Engine-agnostic on purpose: nothing here names JSON, XML or a tool.
 * Adapters (which live with their consumer) map a document onto these shapes.
 */

/** What a row's value is. Drives its colour and its chip. */
export type RowKind =
  | 'string'
  | 'number'
  | 'boolean'
  | 'null'
  | 'object'
  | 'array'
  | 'element'
  | 'attribute'
  | 'text'
  | 'more';

export interface DiagramRow {
  key: string;
  /** Rendered on the right of the row. For a link row, the child count. */
  value: string;
  kind: RowKind;
  /** A link row has an edge to a child card; its value draws as a chip. */
  role?: 'link';
}

export interface DiagramNode {
  id: string;
  /** Small caps line above the title, e.g. `object` or `array[12]`. */
  eyebrow?: string;
  title: string;
  rows: DiagramRow[];
  /** Short text chip at the header's right, e.g. a match count. */
  badge?: string;
}

export interface DiagramEdge {
  id: string;
  /** The child card. */
  from: string;
  /** The parent card. */
  to: string;
  /** Row of the parent the edge leaves from; the header when absent. */
  toRow?: number;
  /** Row of the child the edge enters; the header when absent. */
  fromRow?: number;
  style?: 'solid' | 'dashed';
}

export interface Diagram {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

/** Index nodes by id once, so hot paths never scan the array. */
export function indexNodes(d: Diagram): Map<string, DiagramNode> {
  const m = new Map<string, DiagramNode>();
  for (const n of d.nodes) m.set(n.id, n);
  return m;
}

/** Drops edges that point at nodes outside the diagram. */
export function pruneEdges(d: Diagram): DiagramEdge[] {
  const ids = new Set(d.nodes.map((n) => n.id));
  return d.edges.filter((e) => ids.has(e.from) && ids.has(e.to));
}
