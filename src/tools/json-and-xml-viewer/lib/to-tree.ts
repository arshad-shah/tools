import type { TreeNodeData } from '@/shared/ui/code-tree-model';
import { ancestors, isContainer, summaryOf, type DocNode } from './doc-model';

/**
 * Code-like rows for the Tree (spec §7.2): JSON members read `"key": value`,
 * elements `<name attr="...">`, attributes `@attr`, text `#text`. Children
 * are built lazily, so a million-node document costs nothing until opened.
 */

export type { TreeNodeData };

const ELLIPSIS = String.fromCodePoint(0x2026);
export const TREE_VALUE_MAX = 200;
const LABEL_ATTRS = 3;

const clip = (s: string, max = TREE_VALUE_MAX) =>
  s.length > max ? s.slice(0, max - 1) + ELLIPSIS : s;

function labelOf(n: DocNode): string {
  switch (n.kind) {
    case 'element': {
      const attrs = (n.children ?? []).filter((c) => c.kind === 'attribute');
      const shown = attrs
        .slice(0, LABEL_ATTRS)
        .map((a) => ` ${a.name}="${clip(a.value ?? '', 40)}"`)
        .join('');
      const more = attrs.length > LABEL_ATTRS ? ` ${ELLIPSIS}` : '';
      return `<${n.name}${shown}${more}>`;
    }
    case 'attribute':
      return `@${n.name}`;
    case 'text':
      return '#text';
    case 'cdata':
      return '#cdata';
    case 'comment':
      return '#comment';
    default:
      if (typeof n.key === 'number') return String(n.key);
      if (n.key !== undefined) return JSON.stringify(n.key);
      return '$';
  }
}

function valueOf(n: DocNode): TreeNodeData['value'] {
  const v = n.value ?? '';
  switch (n.kind) {
    case 'string':
      return { text: clip(JSON.stringify(v)), kind: 'string' };
    case 'number':
    case 'boolean':
    case 'null':
      return { text: v, kind: n.kind };
    case 'attribute':
      return { text: clip(JSON.stringify(v)), kind: 'string' };
    case 'comment':
      return { text: clip(v), kind: 'comment' };
    case 'text':
    case 'cdata':
      return { text: clip(v), kind: 'plain' };
    default:
      return undefined;
  }
}

export function toTreeNode(n: DocNode): TreeNodeData {
  const node: TreeNodeData = {
    id: n.id,
    label: labelOf(n),
    childCount: n.children?.length ?? 0,
  };
  const value = valueOf(n);
  if (value) node.value = value;
  if (isContainer(n)) node.summary = summaryOf(n);
  const kids = n.children;
  if (kids?.length) node.children = () => kids.map(toTreeNode);
  return node;
}

export function toTreeData(doc: DocNode): TreeNodeData[] {
  return [toTreeNode(doc)];
}

/** Most branches Expand all opens, so a huge document never freezes the tab. */
export const EXPAND_ALL_LIMIT = 20_000;

/** Ids of containers with children, shallowest first, at most `limit`. */
export function allExpandable(
  doc: DocNode,
  limit = EXPAND_ALL_LIMIT,
): Set<string> {
  return expandToDepth(doc, Infinity, limit);
}

/** Ids of containers at depth below `depth` (the root is depth 0), breadth first. */
export function expandToDepth(
  doc: DocNode,
  depth: number,
  limit = EXPAND_ALL_LIMIT,
): Set<string> {
  const out = new Set<string>();
  let level: DocNode[] = [doc];
  for (let d = 0; d < depth && level.length; d++) {
    const next: DocNode[] = [];
    for (const n of level) {
      if (!n.children?.length) continue;
      if (out.size >= limit) return out;
      out.add(n.id);
      for (const c of n.children) next.push(c);
    }
    level = next;
  }
  return out;
}

/** `expanded` plus the ancestors of `ids`; the same set when nothing changes. */
export const withAncestors = (
  doc: DocNode,
  expanded: ReadonlySet<string>,
  ids: Iterable<string>,
): ReadonlySet<string> => {
  let out: Set<string> | null = null;
  for (const id of ids)
    for (const a of ancestors(doc, id))
      if (!expanded.has(a) && !out?.has(a)) (out ??= new Set(expanded)).add(a);
  return out ?? expanded;
};
