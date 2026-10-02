import type { TokenKind } from '@/shared/lib/syntax/types';

/**
 * One node of a `CodeTree`. `children` is lazy: it is called the first time
 * the node is expanded (or walked by a helper below) and the result is cached
 * per node object, so keep node objects stable between renders.
 */
export interface TreeNodeData {
  id: string;
  label: string;
  value?: { text: string; kind: TokenKind };
  /** Shown as a chip while the node is folded, for example `{4}` or `[12]`. */
  summary?: string;
  childCount: number;
  children?: () => TreeNodeData[];
}

/** A visible row of the flattened tree (pre-order). */
export interface FlatTreeRow {
  node: TreeNodeData;
  depth: number;
  /** Last child of its parent (or the last root). */
  isLast: boolean;
  /**
   * One flag per ancestor, root first: `ancestorsLast[d]` tells whether the
   * ancestor at depth `d` is the last child of its own parent. Rows of the
   * same parent share one array, built on first read.
   */
  readonly ancestorsLast: readonly boolean[];
  /** Flat index of the parent row, -1 for roots. */
  parentIndex: number;
  /** 1-based position among its siblings, and the sibling count. */
  posInSet: number;
  setSize: number;
}

/** Text colour class per syntax token kind (tokens.css `syntax-*`). */
export const TOKEN_CLASS: Record<TokenKind, string> = {
  key: 'text-syntax-key',
  string: 'text-syntax-string',
  number: 'text-syntax-number',
  boolean: 'text-syntax-boolean',
  null: 'text-syntax-null',
  punct: 'text-syntax-punct',
  comment: 'text-syntax-comment',
  keyword: 'text-syntax-keyword',
  tag: 'text-syntax-tag',
  attr: 'text-syntax-attr',
  fn: 'text-syntax-fn',
  regex: 'text-syntax-regex',
  plain: 'text-fg',
};

const NO_FLAGS: readonly boolean[] = Object.freeze([]);
const NO_NODES: readonly TreeNodeData[] = Object.freeze([]);
const childCache = new WeakMap<TreeNodeData, readonly TreeNodeData[]>();

export const isExpandable = (node: TreeNodeData): boolean =>
  node.childCount > 0 && typeof node.children === 'function';

/** The node's children, calling its lazy `children()` at most once. */
export function childrenOf(node: TreeNodeData): readonly TreeNodeData[] {
  if (!isExpandable(node)) return NO_NODES;
  let kids = childCache.get(node);
  if (!kids) {
    kids = node.children!();
    childCache.set(node, kids);
  }
  return kids;
}

/** Persistent list of ancestor flags; the array is built on first read. */
interface FlagCell {
  last: boolean;
  prev: FlagCell | null;
  length: number;
  array?: readonly boolean[];
}

function flagArray(cell: FlagCell | null): readonly boolean[] {
  if (!cell) return NO_FLAGS;
  if (!cell.array) {
    const a = new Array<boolean>(cell.length);
    for (let c: FlagCell | null = cell; c; c = c.prev) a[c.length - 1] = c.last;
    cell.array = a;
  }
  return cell.array;
}

/** Rows keep the shared cell and materialise `ancestorsLast` lazily, so deep
 * documents flatten in linear time. */
class Row implements FlatTreeRow {
  constructor(
    readonly node: TreeNodeData,
    readonly depth: number,
    readonly isLast: boolean,
    private readonly flags: FlagCell | null,
    readonly parentIndex: number,
    readonly posInSet: number,
    readonly setSize: number,
  ) {}
  get ancestorsLast(): readonly boolean[] {
    return flagArray(this.flags);
  }
}

interface Frame {
  list: readonly TreeNodeData[];
  i: number;
  depth: number;
  flags: FlagCell | null;
  parentIndex: number;
}

/**
 * Visible rows in display order. Iterative (no recursion limit on deep
 * documents); children are only read for expanded nodes.
 */
export function flattenVisible(
  roots: readonly TreeNodeData[],
  expanded: ReadonlySet<string>,
): FlatTreeRow[] {
  const out: FlatTreeRow[] = [];
  const stack: Frame[] = [
    { list: roots, i: 0, depth: 0, flags: null, parentIndex: -1 },
  ];
  while (stack.length > 0) {
    const f = stack[stack.length - 1];
    if (f.i >= f.list.length) {
      stack.pop();
      continue;
    }
    const k = f.i++;
    const node = f.list[k];
    const isLast = k === f.list.length - 1;
    const index = out.length;
    out.push(
      new Row(
        node,
        f.depth,
        isLast,
        f.flags,
        f.parentIndex,
        k + 1,
        f.list.length,
      ),
    );
    if (expanded.size > 0 && expanded.has(node.id) && isExpandable(node)) {
      const kids = childrenOf(node);
      if (kids.length > 0)
        stack.push({
          list: kids,
          i: 0,
          depth: f.depth + 1,
          flags: { last: isLast, prev: f.flags, length: f.depth + 1 },
          parentIndex: index,
        });
    }
  }
  return out;
}

/** Default cap on ids added by the expand helpers (huge documents). */
export const EXPAND_LIMIT = 200_000;

/**
 * Ids to expand so every node shallower than `depth` is open (`depth` 1
 * opens the roots). Breadth first, so a `limit` cut keeps the top levels.
 */
export function expandToDepth(
  roots: readonly TreeNodeData[],
  depth: number,
  limit = EXPAND_LIMIT,
): Set<string> {
  const out = new Set<string>();
  let level: readonly TreeNodeData[] = roots;
  for (let d = 0; d < depth && level.length > 0; d++) {
    const next: TreeNodeData[] = [];
    for (const node of level) {
      if (!isExpandable(node)) continue;
      if (out.size >= limit) return out;
      out.add(node.id);
      if (d + 1 < depth) for (const kid of childrenOf(node)) next.push(kid);
    }
    level = next;
  }
  return out;
}

/** Ids to expand every expandable node (capped by `limit`). */
export const expandAll = (
  roots: readonly TreeNodeData[],
  limit = EXPAND_LIMIT,
): Set<string> => expandToDepth(roots, Infinity, limit);

export const collapseAll = (): Set<string> => new Set<string>();

/**
 * Returns `expanded` plus the ancestors of every id in `targets` (one
 * depth-first walk; reads lazy children of the whole tree when a target is
 * deep or missing). Returns the same set when nothing was added.
 */
export function expandToIds(
  roots: readonly TreeNodeData[],
  expanded: ReadonlySet<string>,
  targets: Iterable<string>,
): ReadonlySet<string> {
  const want = new Set(targets);
  if (want.size === 0) return expanded;
  let out: Set<string> | null = null;
  const path: TreeNodeData[] = [];
  const stack: { list: readonly TreeNodeData[]; i: number }[] = [
    { list: roots, i: 0 },
  ];
  while (stack.length > 0 && want.size > 0) {
    const f = stack[stack.length - 1];
    if (f.i >= f.list.length) {
      stack.pop();
      path.pop();
      continue;
    }
    const node = f.list[f.i++];
    if (want.delete(node.id)) {
      for (const a of path) {
        if (expanded.has(a.id) || out?.has(a.id)) continue;
        out ??= new Set(expanded);
        out.add(a.id);
      }
    }
    if (isExpandable(node)) {
      path.push(node);
      stack.push({ list: childrenOf(node), i: 0 });
    }
  }
  return out ?? expanded;
}

/** Ids of the ancestors of `id`, root first, or null when it is not found. */
export function findPath(
  roots: readonly TreeNodeData[],
  id: string,
): string[] | null {
  const path: string[] = [];
  const stack: { list: readonly TreeNodeData[]; i: number }[] = [
    { list: roots, i: 0 },
  ];
  while (stack.length > 0) {
    const f = stack[stack.length - 1];
    if (f.i >= f.list.length) {
      stack.pop();
      path.pop();
      continue;
    }
    const node = f.list[f.i++];
    if (node.id === id) return path.slice();
    if (isExpandable(node)) {
      path.push(node.id);
      stack.push({ list: childrenOf(node), i: 0 });
    }
  }
  return null;
}

/** Flat index of `id`, checking `hint` first; -1 when it is not visible. */
export function indexOfId(
  rows: readonly FlatTreeRow[],
  id: string | null | undefined,
  hint = -1,
): number {
  if (id == null) return -1;
  if (hint >= 0 && hint < rows.length && rows[hint].node.id === id) return hint;
  for (let i = 0; i < rows.length; i++) if (rows[i].node.id === id) return i;
  return -1;
}

/** Flat indices of the ancestors of row `index`, indexed by depth. */
export function branchOf(
  rows: readonly FlatTreeRow[],
  index: number,
): number[] {
  if (index < 0 || index >= rows.length) return [];
  const out = new Array<number>(rows[index].depth);
  for (let p = rows[index].parentIndex; p >= 0; p = rows[p].parentIndex)
    out[rows[p].depth] = p;
  return out;
}

/** Ids of the expandable siblings of row `index` (itself included). */
export function expandableSiblingIds(
  rows: readonly FlatTreeRow[],
  roots: readonly TreeNodeData[],
  index: number,
): string[] {
  const row = rows[index];
  if (!row) return [];
  const list =
    row.parentIndex < 0 ? roots : childrenOf(rows[row.parentIndex].node);
  return list.filter(isExpandable).map((n) => n.id);
}

/** Label text used for type-ahead: leading quotes and markup dropped. */
const matchText = (label: string) =>
  label.replace(/^["'<@#$/[(]+/, '').toLowerCase();

/**
 * Next row after `from` (wrapping) whose label starts with `text`, ignoring
 * case and leading quotes; -1 when none does.
 */
export function typeAheadIndex(
  rows: readonly FlatTreeRow[],
  from: number,
  text: string,
): number {
  const n = rows.length;
  const needle = text.toLowerCase();
  if (n === 0 || needle === '') return -1;
  for (let step = 1; step <= n; step++) {
    const i = (((from + step) % n) + n) % n;
    if (matchText(rows[i].node.label).startsWith(needle)) return i;
  }
  return -1;
}
