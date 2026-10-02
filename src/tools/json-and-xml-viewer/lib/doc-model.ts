import { xpathSeg, type PathSeg } from './paths';

/**
 * One document model for the Tree, Map, Query and path bar, whatever the
 * source format. Ids are the node's JSONPath (JSON) or XPath (XML), so they
 * are stable across re-parses of the same shape.
 */

export type DocKind =
  | 'object'
  | 'array'
  | 'string'
  | 'number'
  | 'boolean'
  | 'null'
  | 'element'
  | 'attribute'
  | 'text'
  | 'comment'
  | 'cdata';

export interface DocNode {
  id: string;
  path: PathSeg[];
  kind: DocKind;
  /** Object key or array index (JSON). */
  key?: string | number;
  /** Element or attribute name (XML). */
  name?: string;
  /** Primitive value as text (JSON scalars, attribute values, text). */
  value?: string;
  childCount: number;
  children?: DocNode[];
  /** Source offsets `[start, end)` of the value or element. */
  range?: [number, number];
  /** Source offset of an object member's key, when known. */
  keyStart?: number;
}

export const isContainer = (n: DocNode): boolean =>
  n.kind === 'object' || n.kind === 'array' || n.kind === 'element';

const ELEMENT = 1;
const TEXT = 3;
const CDATA = 4;
const COMMENT = 8;

/**
 * Start and end offsets of every element, in document order, from a light
 * scan of the source (the DOM keeps no positions).
 */
export function scanElementRanges(text: string): [number, number][] {
  const out: [number, number][] = [];
  const open: number[] = [];
  const n = text.length;
  let i = 0;
  while (i < n) {
    const lt = text.indexOf('<', i);
    if (lt < 0) break;
    if (text.startsWith('<!--', lt)) {
      const e = text.indexOf('-->', lt + 4);
      i = e < 0 ? n : e + 3;
    } else if (text.startsWith('<![CDATA[', lt)) {
      const e = text.indexOf(']]>', lt + 9);
      i = e < 0 ? n : e + 3;
    } else if (text.startsWith('<?', lt)) {
      const e = text.indexOf('?>', lt + 2);
      i = e < 0 ? n : e + 2;
    } else if (text.startsWith('<!', lt)) {
      // DOCTYPE, possibly with an internal subset in brackets.
      let j = lt + 2;
      let depth = 0;
      while (j < n) {
        const c = text[j];
        if (c === '[') depth++;
        else if (c === ']') depth--;
        else if (c === '>' && depth <= 0) break;
        j++;
      }
      i = j + 1;
    } else if (text[lt + 1] === '/') {
      const e = text.indexOf('>', lt);
      i = e < 0 ? n : e + 1;
      const at = open.pop();
      if (at !== undefined) out[at][1] = i;
    } else {
      // A start tag: skip quoted attribute values, which may hold '>'.
      let j = lt + 1;
      let quote = '';
      while (j < n) {
        const c = text[j];
        if (quote) {
          if (c === quote) quote = '';
        } else if (c === '"' || c === "'") quote = c;
        else if (c === '>') break;
        j++;
      }
      i = j + 1;
      out.push([lt, i]);
      if (text[j - 1] !== '/') open.push(out.length - 1);
    }
  }
  return out;
}

/** The model of a parsed XML document; `text` supplies element ranges. */
export function fromXml(doc: Document, text = ''): DocNode {
  const ranges = text ? scanElementRanges(text) : [];
  // getElementsByTagName walks in document order, as the scan does.
  const rangeOf = new Map<Element, [number, number]>();
  if (ranges.length) {
    const all = doc.getElementsByTagName('*');
    for (let i = 0; i < all.length && i < ranges.length; i++)
      rangeOf.set(all[i], ranges[i]);
  }
  const element = (el: Element, path: PathSeg[], id: string): DocNode => {
    const node: DocNode = {
      id,
      path,
      kind: 'element',
      name: el.tagName,
      childCount: 0,
    };
    const range = rangeOf.get(el);
    if (range) node.range = [range[0], range[1]];
    return node;
  };

  const rootEl = doc.documentElement;
  const rootSeg: PathSeg = { t: 'el', name: rootEl.tagName, nth: 1, count: 1 };
  const top = element(rootEl, [rootSeg], xpathSeg(rootSeg));
  // Iterative so deep documents never overflow the stack.
  const stack: { node: DocNode; el: Element }[] = [{ node: top, el: rootEl }];
  while (stack.length) {
    const { node, el } = stack.pop()!;
    const kids: DocNode[] = [];
    const leaf = (seg: PathSeg, kind: DocKind, extra: Partial<DocNode>) =>
      kids.push({
        id: node.id + xpathSeg(seg),
        path: [...node.path, seg],
        kind,
        childCount: 0,
        ...extra,
      });
    for (const a of Array.from(el.attributes))
      leaf({ t: 'attr', name: a.name }, 'attribute', {
        name: a.name,
        value: a.value,
      });
    const counts = new Map<string, number>();
    for (const c of Array.from(el.children))
      counts.set(c.tagName, (counts.get(c.tagName) ?? 0) + 1);
    const seen = new Map<string, number>();
    let texts = 0;
    let comments = 0;
    for (const c of Array.from(el.childNodes)) {
      if (c.nodeType === ELEMENT) {
        const child = c as Element;
        const nth = (seen.get(child.tagName) ?? 0) + 1;
        seen.set(child.tagName, nth);
        const seg: PathSeg = {
          t: 'el',
          name: child.tagName,
          nth,
          count: counts.get(child.tagName),
        };
        const k = element(child, [...node.path, seg], node.id + xpathSeg(seg));
        kids.push(k);
        stack.push({ node: k, el: child });
      } else if (c.nodeType === TEXT || c.nodeType === CDATA) {
        const raw = c.nodeValue ?? '';
        // Text and CDATA share XPath's text() numbering.
        if (c.nodeType === TEXT && !/\S/.test(raw)) {
          texts++;
          continue;
        }
        leaf(
          { t: 'text', nth: ++texts },
          c.nodeType === CDATA ? 'cdata' : 'text',
          {
            value: c.nodeType === CDATA ? raw : raw.trim(),
          },
        );
      } else if (c.nodeType === COMMENT) {
        leaf({ t: 'comment', nth: ++comments }, 'comment', {
          value: (c.nodeValue ?? '').trim(),
        });
      }
    }
    node.children = kids;
    node.childCount = kids.length;
  }
  return top;
}

/** Id lookup and parent links, built once per document. */
interface DocIndex {
  byId: Map<string, DocNode>;
  parent: Map<string, string>;
}

const indexes = new WeakMap<DocNode, DocIndex>();

export function indexDoc(root: DocNode): DocIndex {
  let idx = indexes.get(root);
  if (idx) return idx;
  idx = { byId: new Map(), parent: new Map() };
  const stack = [root];
  while (stack.length) {
    const n = stack.pop()!;
    idx.byId.set(n.id, n);
    if (n.children)
      for (const c of n.children) {
        idx.parent.set(c.id, n.id);
        stack.push(c);
      }
  }
  indexes.set(root, idx);
  return idx;
}

export function findById(root: DocNode, id: string): DocNode | null {
  return indexDoc(root).byId.get(id) ?? null;
}

/** Ids from the root down to the parent of `id` (empty for the root). */
export function ancestors(root: DocNode, id: string): string[] {
  const { parent } = indexDoc(root);
  const out: string[] = [];
  let p = parent.get(id);
  while (p !== undefined) {
    out.push(p);
    p = parent.get(p);
  }
  return out.reverse();
}

/** `{4}` keys, `[12]` items or `<3>` children; empty for scalars. */
export function summaryOf(node: DocNode): string {
  switch (node.kind) {
    case 'object':
      return `{${node.childCount}}`;
    case 'array':
      return `[${node.childCount}]`;
    case 'element':
      return `<${node.childCount}>`;
    default:
      return '';
  }
}

/** Where a node starts in the source: its key for object members. */
const startOf = (n: DocNode) => n.keyStart ?? n.range?.[0];

/** The deepest node whose source span holds `offset`, or null. */
export function nodeAtOffset(root: DocNode, offset: number): DocNode | null {
  if (!root.range || offset < root.range[0] || offset > root.range[1])
    return null;
  let node = root;
  for (;;) {
    const kids = node.children;
    if (!kids?.length) return node;
    let lo = 0;
    let hi = kids.length - 1;
    let hit: DocNode | null = null;
    // Ranged children are in source order; unranged ones are skipped.
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      let m = mid;
      while (m <= hi && !kids[m].range) m++;
      if (m > hi) {
        hi = mid - 1;
        continue;
      }
      const k = kids[m];
      const from = startOf(k)!;
      if (offset < from) hi = mid - 1;
      else if (offset >= k.range![1]) lo = m + 1;
      else {
        hit = k;
        break;
      }
    }
    if (!hit) return node;
    node = hit;
  }
}

export { fromFlat, fromJson, fromValue } from './json-model';
