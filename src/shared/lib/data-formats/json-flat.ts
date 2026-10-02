import { parseJsonWithLocations, type LocNode } from './json-locate';

/**
 * A JSON location tree as flat typed arrays in pre-order, so a worker can
 * hand a 20 MB document's offsets back by transfer instead of cloning a
 * million objects. `keys` holds object member keys in visiting order.
 */
export interface FlatLoc {
  kinds: Uint8Array;
  starts: Uint32Array;
  ends: Uint32Array;
  /** -1 for nodes that are not object members. */
  keyStarts: Int32Array;
  counts: Uint32Array;
  keys: string[];
}

export const FLAT_KINDS = [
  'object',
  'array',
  'string',
  'number',
  'boolean',
  'null',
] as const satisfies readonly LocNode['kind'][];

const KIND_CODE = Object.fromEntries(
  FLAT_KINDS.map((k, i) => [k, i]),
) as Record<LocNode['kind'], number>;

function countNodes(root: LocNode): number {
  let n = 0;
  const stack = [root];
  while (stack.length) {
    const node = stack.pop()!;
    n++;
    if (node.children) for (const c of node.children) stack.push(c.node);
  }
  return n;
}

export function flattenLoc(root: LocNode): FlatLoc {
  const total = countNodes(root);
  const flat: FlatLoc = {
    kinds: new Uint8Array(total),
    starts: new Uint32Array(total),
    ends: new Uint32Array(total),
    keyStarts: new Int32Array(total),
    counts: new Uint32Array(total),
    keys: [],
  };
  let i = 0;
  const stack: { node: LocNode; key: string | number | null }[] = [
    { node: root, key: null },
  ];
  while (stack.length) {
    const { node, key } = stack.pop()!;
    flat.kinds[i] = KIND_CODE[node.kind];
    flat.starts[i] = node.start;
    flat.ends[i] = node.end;
    flat.keyStarts[i] = node.keyStart ?? -1;
    flat.counts[i] = node.children?.length ?? 0;
    if (typeof key === 'string') flat.keys.push(key);
    i++;
    const kids = node.children;
    if (kids)
      for (let k = kids.length - 1; k >= 0; k--)
        stack.push({ node: kids[k].node, key: kids[k].key });
  }
  return flat;
}

/** Parses and flattens; the value is left for the caller to `JSON.parse`. */
export function parseJsonFlat(text: string): {
  flat: FlatLoc;
  warnings: ReturnType<typeof parseJsonWithLocations>['warnings'];
} {
  const { root, warnings } = parseJsonWithLocations(text);
  return { flat: flattenLoc(root), warnings };
}
