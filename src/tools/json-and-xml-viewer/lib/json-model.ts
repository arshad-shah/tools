import type { LocNode } from '@/shared/lib/data-formats';
import { FLAT_KINDS, type FlatLoc } from '@/shared/lib/data-formats/json-flat';
import type { DocKind, DocNode } from './doc-model';
import { jsonPathSeg, type PathSeg } from './paths';

/**
 * JSON nodes keep a parent link and build `path` on demand, so a
 * million-node document costs one small object per node, not a copied
 * path array each.
 */
class JsonNode implements DocNode {
  declare id: string;
  declare kind: DocKind;
  declare key?: string | number;
  declare value?: string;
  declare childCount: number;
  declare children?: DocNode[];
  declare range?: [number, number];
  declare keyStart?: number;
  declare seg?: PathSeg;
  declare parent?: JsonNode;

  get path(): PathSeg[] {
    const out: PathSeg[] = this.seg ? [this.seg] : [];
    for (let n = this.parent; n?.seg; n = n.parent) out.push(n.seg);
    return out.reverse();
  }
}

function node(
  parent: JsonNode | undefined,
  key: string | number | undefined,
  kind: DocKind,
  childCount: number,
): JsonNode {
  const n = new JsonNode();
  if (parent && key !== undefined) {
    const seg: PathSeg =
      typeof key === 'number' ? { t: 'index', i: key } : { t: 'key', k: key };
    n.id = parent.id + jsonPathSeg(seg);
    n.seg = seg;
    n.parent = parent;
    n.key = key;
  } else n.id = '$';
  n.kind = kind;
  n.childCount = childCount;
  return n;
}

function scalarText(v: unknown): string {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'string') return v;
  return String(v);
}

const isContainerKind = (k: DocKind) => k === 'object' || k === 'array';

/** The model of a parsed JSON value and its location tree. */
export function fromJson(value: unknown, root: LocNode): DocNode {
  const make = (
    v: unknown,
    loc: LocNode,
    parent?: JsonNode,
    key?: string | number,
  ) => {
    const n = node(parent, key, loc.kind, loc.children?.length ?? 0);
    n.range = [loc.start, loc.end];
    if (loc.keyStart !== undefined) n.keyStart = loc.keyStart;
    if (!isContainerKind(loc.kind)) n.value = scalarText(v);
    return n;
  };
  const top = make(value, root);
  // Iterative so 10,000 levels of nesting never overflow the stack.
  const stack: { n: JsonNode; loc: LocNode; v: unknown }[] = [
    { n: top, loc: root, v: value },
  ];
  while (stack.length) {
    const { n, loc, v } = stack.pop()!;
    if (!loc.children) continue;
    const kids: DocNode[] = [];
    for (const { key, node: childLoc } of loc.children) {
      const childV = (v as Record<string | number, unknown>)?.[key];
      const child = make(childV, childLoc, n, key);
      kids.push(child);
      stack.push({ n: child, loc: childLoc, v: childV });
    }
    n.children = kids;
  }
  return top;
}

/** The model from a natively parsed value and a worker's flat offsets. */
export function fromFlat(value: unknown, flat: FlatLoc): DocNode {
  let i = 0;
  let k = 0;
  const make = (v: unknown, parent?: JsonNode, key?: string | number) => {
    const kind = FLAT_KINDS[flat.kinds[i]];
    const n = node(parent, key, kind, flat.counts[i]);
    n.range = [flat.starts[i], flat.ends[i]];
    if (flat.keyStarts[i] >= 0) n.keyStart = flat.keyStarts[i];
    if (!isContainerKind(kind)) n.value = scalarText(v);
    i++;
    return n;
  };
  const top = make(value);
  // Pre-order, matching the flattening: a node, then its children in order.
  const stack: { n: JsonNode; v: unknown; next: number }[] = [
    { n: top, v: value, next: 0 },
  ];
  if (isContainerKind(top.kind)) top.children = [];
  if (!top.childCount) stack.pop();
  while (stack.length) {
    const f = stack[stack.length - 1];
    if (f.next >= f.n.childCount) {
      stack.pop();
      continue;
    }
    const idx = f.next++;
    const key = f.n.kind === 'array' ? idx : flat.keys[k++];
    const childV = (f.v as Record<string | number, unknown>)?.[key];
    const child = make(childV, f.n, key);
    f.n.children!.push(child);
    if (isContainerKind(child.kind)) child.children = [];
    if (child.childCount) stack.push({ n: child, v: childV, next: 0 });
  }
  return top;
}

function kindOf(v: unknown): DocKind {
  if (Array.isArray(v)) return 'array';
  if (v === null || v === undefined) return 'null';
  switch (typeof v) {
    case 'object':
      return 'object';
    case 'number':
    case 'bigint':
      return 'number';
    case 'boolean':
      return 'boolean';
    default:
      return 'string';
  }
}

/** The model of a plain value with no source (YAML input). */
export function fromValue(value: unknown): DocNode {
  const make = (v: unknown, parent?: JsonNode, key?: string | number) => {
    const kind = kindOf(v);
    const count = Array.isArray(v)
      ? v.length
      : kind === 'object'
        ? Object.keys(v as object).length
        : 0;
    const n = node(parent, key, kind, count);
    if (!isContainerKind(kind)) n.value = scalarText(v);
    return n;
  };
  const top = make(value);
  const stack: { n: JsonNode; v: unknown }[] = [{ n: top, v: value }];
  while (stack.length) {
    const { n, v } = stack.pop()!;
    if (!isContainerKind(n.kind)) continue;
    const entries: [string | number, unknown][] = Array.isArray(v)
      ? v.map((x, idx) => [idx, x])
      : Object.entries(v as object);
    n.children = entries.map(([key, childV]) => {
      const child = make(childV, n, key);
      stack.push({ n: child, v: childV });
      return child;
    });
  }
  return top;
}
