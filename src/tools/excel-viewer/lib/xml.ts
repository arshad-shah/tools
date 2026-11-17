import { ToolError } from '@/shared/lib/errors';

/** Parses a workbook part; a malformed part is an INVALID_FILE error. */
export function parseXml(text: string, part: string): Document {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0)
    throw new ToolError(
      'INVALID_FILE',
      `${part} is not well-formed XML; the workbook may be damaged`,
    );
  return doc;
}

/**
 * Elements by local name in any namespace: SpreadsheetML comes in the
 * transitional and the strict namespace, with or without a prefix.
 */
export const all = (root: Document | Element, name: string): Element[] =>
  Array.from(root.getElementsByTagNameNS('*', name));

export const first = (
  root: Document | Element,
  name: string,
): Element | undefined => root.getElementsByTagNameNS('*', name)[0];

/** Direct children with this local name. */
export const children = (el: Element, name: string): Element[] =>
  Array.from(el.children).filter((c) => c.localName === name);

/** An attribute by local name in any namespace (`r:id` and the like). */
export function attr(el: Element, name: string): string | null {
  const plain = el.getAttribute(name);
  if (plain !== null) return plain;
  for (const a of Array.from(el.attributes))
    if (a.localName === name) return a.value;
  return null;
}

/**
 * The text of a string item (`<si>`, `<is>`): its `<t>`, or its rich-text
 * runs' `<t>`s joined. Phonetic guides (`<rPh>`) are not part of the text.
 */
export function stringItemText(el: Element): string {
  let out = '';
  for (const c of Array.from(el.children)) {
    if (c.localName === 't') out += c.textContent ?? '';
    else if (c.localName === 'r')
      for (const t of children(c, 't')) out += t.textContent ?? '';
  }
  return decodeEscapes(out);
}

/** Excel writes control characters as `_xHHHH_`; `_x005F_` escapes an underscore. */
export function decodeEscapes(s: string): string {
  if (!s.includes('_x')) return s;
  return s.replace(/_x([0-9A-Fa-f]{4})_/g, (_, h: string) =>
    String.fromCharCode(parseInt(h, 16)),
  );
}

/** `xl/` + `worksheets/sheet1.xml`, with `..` and absolute targets resolved. */
export function resolvePart(base: string, target: string): string {
  if (target.startsWith('/')) return target.slice(1);
  const dir = base.includes('/')
    ? base.slice(0, base.lastIndexOf('/') + 1)
    : '';
  const parts: string[] = [];
  for (const p of (dir + target).split('/')) {
    if (p === '..') parts.pop();
    else if (p !== '.' && p !== '') parts.push(p);
  }
  return parts.join('/');
}

/** A `.rels` part as Id to { target, type }. */
export function readRels(
  text: string | null,
  part: string,
): Map<string, { target: string; type: string }> {
  const out = new Map<string, { target: string; type: string }>();
  if (!text) return out;
  for (const r of all(parseXml(text, part), 'Relationship')) {
    const id = r.getAttribute('Id');
    const target = r.getAttribute('Target');
    if (id && target && r.getAttribute('TargetMode') !== 'External')
      out.set(id, { target, type: r.getAttribute('Type') ?? '' });
  }
  return out;
}
