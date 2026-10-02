/**
 * Paths into a JSON or XML document, and the strings users copy from them:
 * JSONPath (RFC 9535 normalised form), a JavaScript accessor and XPath.
 */

export type PathSeg =
  | { t: 'key'; k: string }
  | { t: 'index'; i: number }
  /** `nth` is 1-based among same-name siblings; `count` is how many there are. */
  | { t: 'el'; name: string; nth: number; count?: number }
  | { t: 'attr'; name: string }
  /** Text and CDATA nodes, 1-based among the parent's text nodes. */
  | { t: 'text'; nth: number }
  | { t: 'comment'; nth: number };

const JSONPATH_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
const JS_IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/** A single-quoted string literal with `\` and `'` escaped. */
export function quoteName(name: string): string {
  const body = name
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
  return `'${body}'`;
}

/** One segment of a JSONPath (`.name`, `['first name']`, `[0]`). */
export function jsonPathSeg(seg: PathSeg): string {
  switch (seg.t) {
    case 'key':
      return JSONPATH_NAME.test(seg.k) ? `.${seg.k}` : `[${quoteName(seg.k)}]`;
    case 'index':
      return `[${seg.i}]`;
    default:
      return xpathSeg(seg);
  }
}

/** `$.store.book[0]['first name']` */
export function toJsonPath(path: readonly PathSeg[]): string {
  let s = '$';
  for (const seg of path) s += jsonPathSeg(seg);
  return s;
}

/** `data.store.book[0]['first name']` */
export function toJsAccessor(
  path: readonly PathSeg[],
  rootVar = 'data',
): string {
  let s = rootVar;
  for (const seg of path) {
    if (seg.t === 'key')
      s += JS_IDENT.test(seg.k) ? `.${seg.k}` : `[${quoteName(seg.k)}]`;
    else if (seg.t === 'index') s += `[${seg.i}]`;
  }
  return s;
}

/** One XPath step, with its leading slash. */
export function xpathSeg(seg: PathSeg): string {
  switch (seg.t) {
    case 'el':
      return seg.count === 1 ? `/${seg.name}` : `/${seg.name}[${seg.nth}]`;
    case 'attr':
      return `/@${seg.name}`;
    case 'text':
      return `/text()[${seg.nth}]`;
    case 'comment':
      return `/comment()[${seg.nth}]`;
    case 'key':
      return `/${seg.k}`;
    case 'index':
      return `[${seg.i + 1}]`;
  }
}

/** `/catalog/book[2]/@id` (a unique element omits its `[1]`). */
export function toXPath(path: readonly PathSeg[]): string {
  if (path.length === 0) return '/';
  let s = '';
  for (const seg of path) s += xpathSeg(seg);
  return s;
}

/** True when the path addresses an XML document. */
export function isXmlPath(path: readonly PathSeg[]): boolean {
  return path.length > 0 && path[0].t === 'el';
}

/** JSONPath for JSON paths, XPath for XML paths. */
export function toDisplayPath(path: readonly PathSeg[]): string {
  return isXmlPath(path) ? toXPath(path) : toJsonPath(path);
}
