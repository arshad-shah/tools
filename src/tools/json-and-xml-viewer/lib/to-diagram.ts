import type {
  Diagram,
  DiagramEdge,
  DiagramNode,
  DiagramRow,
  RowKind,
} from '@/shared/diagram';
import { isContainer, summaryOf, type DocNode } from './doc-model';

/**
 * The Map's card diagram for a document (spec §7.2, §6.5): every object,
 * array or element is a card whose rows are its members. A nested member is
 * a link row whose edge leaves from that exact row. Cards are added
 * breadth-first up to `cap`; the rest of a parent's members fold into one
 * `more` row unless the user expanded that parent.
 */

export const VALUE_PREVIEW_MAX = 60;
/** Rows per card before the rest fold into a `more` row. */
export const ROW_CAP = 1000;

const ELLIPSIS = String.fromCodePoint(0x2026);
const fmt = new Intl.NumberFormat('en-US');

export interface ToDiagramOptions {
  cap?: number;
  expanded?: ReadonlySet<string>;
  rowCap?: number;
}

export interface RowOwner {
  cardId: string;
  row: number;
}

export interface DiagramResult {
  diagram: Diagram;
  /** Cards the whole document would need. */
  total: number;
  /** Cards in this diagram. */
  shown: number;
  /** Where each doc node shows: its own card (row -1) or a row of its parent. */
  rowOwner: Map<string, RowOwner>;
}

export function preview(text: string, max = VALUE_PREVIEW_MAX): string {
  const flat = text.replace(/\s+/g, ' ');
  return flat.length > max ? flat.slice(0, max - 1) + ELLIPSIS : flat;
}

export function moreLabel(n: number): string {
  return `+${fmt.format(n)} more`;
}

function eyebrowOf(n: DocNode): string {
  if (n.kind === 'array') return `array[${n.childCount}]`;
  return n.kind;
}

function titleOf(n: DocNode, parentTitle?: string): string {
  if (n.kind === 'element') return n.name ?? '';
  if (typeof n.key === 'number') return `${parentTitle ?? ''}[${n.key}]`;
  if (n.key !== undefined) return n.key;
  return '$';
}

function rowKey(n: DocNode): string {
  switch (n.kind) {
    case 'attribute':
      return `@${n.name}`;
    case 'text':
      return '#text';
    case 'cdata':
      return '#cdata';
    case 'comment':
      return '#comment';
    case 'element':
      return n.name ?? '';
    default:
      return typeof n.key === 'number' ? `[${n.key}]` : String(n.key ?? '');
  }
}

function rowKind(n: DocNode): RowKind {
  if (n.kind === 'cdata' || n.kind === 'comment') return 'text';
  return n.kind;
}

/** Number of container nodes in the document. */
export function countCards(root: DocNode): number {
  let total = 0;
  const stack = [root];
  while (stack.length) {
    const n = stack.pop()!;
    if (!isContainer(n)) continue;
    total++;
    if (n.children) for (const c of n.children) stack.push(c);
  }
  return total;
}

export function toDiagram(
  doc: DocNode,
  {
    cap = 2000,
    expanded = new Set<string>(),
    rowCap = ROW_CAP,
  }: ToDiagramOptions = {},
): DiagramResult {
  const nodes: DiagramNode[] = [];
  const edges: DiagramEdge[] = [];
  const rowOwner = new Map<string, RowOwner>();
  // The root card is always shown and does not count against the cap.
  let counted = 0;

  const queue: { node: DocNode; title: string }[] = [];
  const card = (n: DocNode, title: string) => {
    queue.push({ node: n, title });
    rowOwner.set(n.id, { cardId: n.id, row: -1 });
  };
  card(doc, titleOf(doc));

  for (let q = 0; q < queue.length; q++) {
    const { node, title } = queue[q];
    const rows: DiagramRow[] = [];
    const open = expanded.has(node.id);
    const kids = node.children ?? [];
    for (let i = 0; i < kids.length; i++) {
      const k = kids[i];
      const nested = isContainer(k);
      const capped =
        !open && (rows.length >= rowCap || (nested && counted >= cap));
      if (capped) {
        rows.push({ key: moreLabel(kids.length - i), value: '', kind: 'more' });
        break;
      }
      const row = rows.length;
      if (nested) {
        if (!open) counted++;
        rows.push({
          key: rowKey(k),
          value: summaryOf(k),
          kind: rowKind(k),
          role: 'link',
        });
        edges.push({ id: `e:${k.id}`, from: k.id, to: node.id, toRow: row });
        card(k, titleOf(k, title));
      } else {
        rows.push({
          key: rowKey(k),
          value: preview(k.value ?? ''),
          kind: rowKind(k),
        });
        rowOwner.set(k.id, { cardId: node.id, row });
      }
    }
    nodes.push({ id: node.id, eyebrow: eyebrowOf(node), title, rows });
  }

  return {
    diagram: { nodes, edges },
    total: countCards(doc),
    shown: nodes.length,
    rowOwner,
  };
}
