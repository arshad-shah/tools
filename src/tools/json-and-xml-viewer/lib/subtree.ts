import { xmlToJson } from '@/shared/lib/data-formats';
import type { DocNode } from './doc-model';
import type { PathSeg } from './paths';

/** The JSON value at `path`, or undefined when it does not exist. */
export function valueAt(value: unknown, path: readonly PathSeg[]): unknown {
  let v = value;
  for (const seg of path) {
    if (v === null || typeof v !== 'object') return undefined;
    if (seg.t === 'key') v = (v as Record<string, unknown>)[seg.k];
    else if (seg.t === 'index') v = (v as unknown[])[seg.i];
    else return undefined;
  }
  return v;
}

/** The DOM node a doc-model XML id names (ids are XPath expressions). */
export function xmlNodeAt(xml: Document, id: string): Node | null {
  try {
    return xml.evaluate(
      id,
      xml,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null,
    ).singleNodeValue;
  } catch {
    return null;
  }
}

/** The text the "Copy value" action copies. */
export function nodeValueText(
  node: DocNode,
  value: unknown,
  xml: Document | null,
): string {
  if (node.value !== undefined && node.kind !== 'element') return node.value;
  return subtreeJson(node, value, xml);
}

/** The node and everything under it as pretty JSON. */
export function subtreeJson(
  node: DocNode,
  value: unknown,
  xml: Document | null,
): string {
  if (!xml) return JSON.stringify(valueAt(value, node.path) ?? null, null, 2);
  const dom = xmlNodeAt(xml, node.id);
  if (!dom) return 'null';
  if (dom.nodeType !== 1) return JSON.stringify(dom.nodeValue ?? '');
  const copy = document.implementation.createDocument(null, null, null);
  copy.appendChild(copy.importNode(dom, true));
  return JSON.stringify(xmlToJson(copy), null, 2);
}
