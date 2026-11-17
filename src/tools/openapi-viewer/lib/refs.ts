/** Local `$ref` resolution (`#/a/b`), with a guard against cycles. */

export type Obj = Record<string, unknown>;

export const isObj = (v: unknown): v is Obj =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Decodes one JSON Pointer segment (`~1` is `/`, `~0` is `~`). */
function segment(s: string): string {
  let t = s;
  try {
    t = decodeURIComponent(s);
  } catch {
    // Keep the raw text: a stray % is a valid key character.
  }
  return t.replace(/~1/g, '/').replace(/~0/g, '~');
}

/** The value at a local `$ref` (`#/components/schemas/Pet`), or undefined. */
export function lookupRef(doc: unknown, ref: string): unknown {
  if (!ref.startsWith('#')) return undefined;
  const path = ref.slice(1);
  if (path === '' || path === '/') return doc;
  if (!path.startsWith('/')) return undefined;
  let cur: unknown = doc;
  for (const raw of path.slice(1).split('/')) {
    const key = segment(raw);
    if (Array.isArray(cur)) cur = cur[Number(key)];
    else if (isObj(cur)) cur = Object.hasOwn(cur, key) ? cur[key] : undefined;
    else return undefined;
  }
  return cur;
}

/** The last segment of a ref: `Pet` for `#/components/schemas/Pet`. */
export const refName = (ref: string) =>
  segment(ref.slice(ref.lastIndexOf('/') + 1));

export interface Resolved {
  value: unknown;
  /** The refs followed to get here, outermost first. */
  refs: string[];
  /** A ref that points outside the document, or nowhere. */
  missing?: string;
  /** A ref chain that loops back on itself. */
  circular?: string;
}

/**
 * Follows `$ref` until a value without one: `seen` holds the refs already
 * being expanded further up (a schema that contains itself), so meeting one
 * again reports it as circular instead of looping.
 */
export function resolve(
  doc: unknown,
  node: unknown,
  seen: readonly string[] = [],
): Resolved {
  const refs: string[] = [];
  let cur = node;
  while (isObj(cur) && typeof cur.$ref === 'string') {
    const ref = cur.$ref;
    if (seen.includes(ref) || refs.includes(ref))
      return { value: undefined, refs, circular: ref };
    refs.push(ref);
    const next = lookupRef(doc, ref);
    if (next === undefined) return { value: undefined, refs, missing: ref };
    cur = next;
  }
  return { value: cur, refs };
}

/** `resolve` for objects: the object, or an empty one when it is not there. */
export function resolveObj(doc: unknown, node: unknown): Obj {
  const r = resolve(doc, node);
  return isObj(r.value) ? r.value : {};
}

/**
 * A copy of `node` with every local ref expanded inline, for display. A
 * ref that loops back becomes `{ $circular: ref }`, one that cannot be found
 * `{ $missing: ref }`. Past `maxDepth` levels or `budget` expanded nodes
 * (a huge, densely linked document), `{ $ref }` is kept as is.
 */
export function deref(
  doc: unknown,
  node: unknown,
  { maxDepth = 40, budget = 5000 } = {},
): unknown {
  let left = budget;
  const walk = (
    n: unknown,
    seen: readonly string[],
    depth: number,
  ): unknown => {
    left--;
    if (Array.isArray(n)) return n.map((x) => walk(x, seen, depth + 1));
    if (!isObj(n)) return n;
    if (typeof n.$ref === 'string') {
      if (depth >= maxDepth || left <= 0) return { $ref: n.$ref };
      const r = resolve(doc, n, seen);
      if (r.circular) return { $circular: r.circular };
      if (r.missing) return { $missing: r.missing };
      return walk(r.value, [...seen, ...r.refs], depth + 1);
    }
    const out: Obj = {};
    for (const [k, v] of Object.entries(n)) out[k] = walk(v, seen, depth + 1);
    return out;
  };
  return walk(node, [], 0);
}
