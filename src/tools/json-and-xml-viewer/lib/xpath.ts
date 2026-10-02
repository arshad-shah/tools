import { ToolError } from '@/shared/lib/errors';
import { xpathSeg, type PathSeg } from './paths';

/** XPath 1.0 over the parsed DOM, with results named by `fromXml` ids. */

export interface XPathRow {
  /** The doc-model id of the node, or '' for a string, number or boolean. */
  nodeId: string;
  text: string;
}

const ELEMENT = 1;
const ATTRIBUTE = 2;
const TEXT = 3;
const CDATA = 4;
const COMMENT = 8;

/** The `fromXml` path of a DOM node, or null for nodes the model skips. */
export function domPath(node: Node): PathSeg[] | null {
  const out: PathSeg[] = [];
  let n: Node | null = node;
  if (n.nodeType === ATTRIBUTE) {
    out.push({ t: 'attr', name: (n as Attr).name });
    n = (n as Attr).ownerElement;
  } else if (
    n.nodeType === TEXT ||
    n.nodeType === CDATA ||
    n.nodeType === COMMENT
  ) {
    const comment = n.nodeType === COMMENT;
    let nth = 0;
    for (let s: Node | null = n; s; s = s.previousSibling) {
      const t = s.nodeType;
      if (comment ? t === COMMENT : t === TEXT || t === CDATA) nth++;
    }
    out.push(comment ? { t: 'comment', nth } : { t: 'text', nth });
    n = n.parentNode;
  }
  for (; n && n.nodeType === ELEMENT; n = n.parentNode) {
    const el = n as Element;
    const parent = el.parentElement;
    if (!parent) {
      out.push({ t: 'el', name: el.tagName, nth: 1, count: 1 });
      continue;
    }
    let nth = 0;
    let count = 0;
    for (const s of Array.from(parent.children)) {
      if (s.tagName !== el.tagName) continue;
      count++;
      if (s === el) nth = count;
    }
    out.push({ t: 'el', name: el.tagName, nth, count });
  }
  if (!n || n.nodeType !== 9) return null;
  return out.reverse();
}

export function domId(node: Node): string {
  const path = domPath(node);
  return path ? path.map(xpathSeg).join('') : '';
}

function nodeText(node: Node): string {
  if (node.nodeType === ATTRIBUTE) return (node as Attr).value;
  return (node.textContent ?? '').trim();
}

/** Runs `expr`; a string, number or boolean result is one row. */
export function queryXPath(doc: Document, expr: string): XPathRow[] {
  const root = doc.documentElement;
  const resolver = root
    ? (prefix: string | null) => root.lookupNamespaceURI(prefix)
    : null;
  try {
    const any = doc.evaluate(expr, doc, resolver, XPathResult.ANY_TYPE, null);
    switch (any.resultType) {
      case XPathResult.NUMBER_TYPE:
        return [{ nodeId: '', text: String(any.numberValue) }];
      case XPathResult.STRING_TYPE:
        return [{ nodeId: '', text: any.stringValue }];
      case XPathResult.BOOLEAN_TYPE:
        return [{ nodeId: '', text: String(any.booleanValue) }];
    }
    const snap = doc.evaluate(
      expr,
      doc,
      resolver,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null,
    );
    const rows: XPathRow[] = [];
    for (let i = 0; i < snap.snapshotLength; i++) {
      const n = snap.snapshotItem(i)!;
      rows.push({ nodeId: domId(n), text: nodeText(n) });
    }
    return rows;
  } catch (e) {
    const message = (e as Error)?.message || 'Invalid XPath expression';
    throw new ToolError('INVALID_INPUT', message, { cause: e });
  }
}
