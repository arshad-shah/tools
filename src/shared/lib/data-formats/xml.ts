import { ToolError } from '@/shared/lib/errors';

/**
 * XML on the platform DOMParser: parse errors with line and column, a pretty
 * printer that walks the DOM and keeps the declaration, comments, CDATA,
 * processing instructions, mixed content and `xml:space="preserve"`, and a
 * JSON mapping (`@attr`, `#text`, repeated elements as arrays).
 */

const ELEMENT = 1;
const TEXT = 3;
const CDATA = 4;
const PI = 7;
const COMMENT = 8;
const DOCTYPE = 10;

/** `parsererror` text to a position (Chrome, Firefox and jsdom wording). */
function errorPosition(text: string): { line: number; column: number } | null {
  const m =
    /line (\d+) at column (\d+)/i.exec(text) ??
    /Line Number (\d+), Column (\d+)/i.exec(text) ??
    /^\s*(\d+):(\d+):/.exec(text);
  return m ? { line: Number(m[1]), column: Number(m[2]) } : null;
}

function errorMessage(text: string): string {
  const firefox = /XML Parsing Error:\s*([^\n]+)/i.exec(text)?.[1];
  const chrome = /error on line \d+ at column \d+:\s*([^\n]+)/i.exec(text)?.[1];
  const jsdom = /^\s*\d+:\d+:\s*([^\n]+)/.exec(text)?.[1];
  const raw = (
    firefox ??
    chrome ??
    jsdom ??
    'The XML is not well formed'
  ).trim();
  return raw.replace(/\.$/, '');
}

/** Parses XML; a malformed document is INVALID_INPUT with line and column. */
export function parseXml(text: string): Document {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  const err = doc.getElementsByTagName('parsererror')[0];
  if (err) {
    const detail = err.textContent ?? '';
    const pos = errorPosition(detail);
    const message = errorMessage(detail);
    throw Object.assign(
      new ToolError(
        'INVALID_INPUT',
        pos ? `${message} at line ${pos.line}, column ${pos.column}` : message,
      ),
      pos ?? {},
    );
  }
  return doc;
}

const DECL_RE = /^\uFEFF?\s*(<\?xml\s[^?]*\?>)/;

const escText = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s: string) =>
  escText(s)
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '&#10;')
    .replace(/\t/g, '&#9;');

interface WriteOptions {
  pretty: boolean;
  indent: string;
  comments: boolean;
}

const isBlank = (n: Node) =>
  n.nodeType === TEXT && !/\S/.test(n.nodeValue ?? '');

function openTag(el: Element): string {
  let s = `<${el.tagName}`;
  for (const a of Array.from(el.attributes))
    s += ` ${a.name}="${escAttr(a.value)}"`;
  return s;
}

/** Serialises a node exactly, with no added or removed whitespace. */
function exact(node: Node, opts: WriteOptions): string {
  switch (node.nodeType) {
    case ELEMENT: {
      const el = node as Element;
      const kids = Array.from(el.childNodes);
      if (kids.length === 0) return `${openTag(el)}/>`;
      return `${openTag(el)}>${kids.map((k) => exact(k, opts)).join('')}</${el.tagName}>`;
    }
    case TEXT:
      return escText(node.nodeValue ?? '');
    case CDATA:
      return `<![CDATA[${node.nodeValue ?? ''}]]>`;
    case COMMENT:
      return opts.comments ? `<!--${node.nodeValue ?? ''}-->` : '';
    case PI:
      return `<?${(node as ProcessingInstruction).target}${node.nodeValue ? ` ${node.nodeValue}` : ''}?>`;
    case DOCTYPE: {
      const d = node as DocumentType;
      const id = d.publicId
        ? ` PUBLIC "${d.publicId}" "${d.systemId}"`
        : d.systemId
          ? ` SYSTEM "${d.systemId}"`
          : '';
      return `<!DOCTYPE ${d.name}${id}>`;
    }
    default:
      return '';
  }
}

function write(
  node: Node,
  depth: number,
  opts: WriteOptions,
  out: string[],
): void {
  const pad = opts.pretty ? opts.indent.repeat(depth) : '';
  if (node.nodeType !== ELEMENT) {
    if (isBlank(node)) return;
    const s =
      node.nodeType === TEXT
        ? escText((node.nodeValue ?? '').trim())
        : exact(node, opts);
    if (s) out.push(pad + s);
    return;
  }
  const el = node as Element;
  const kids = Array.from(el.childNodes);
  const preserve = el.getAttribute('xml:space') === 'preserve';
  const mixed = kids.some(
    (k) => (k.nodeType === TEXT && !isBlank(k)) || k.nodeType === CDATA,
  );
  // Mixed content and preserved whitespace are written exactly.
  if (preserve || mixed) {
    out.push(pad + exact(el, opts));
    return;
  }
  const content = kids.filter((k) => !isBlank(k));
  if (content.length === 0) {
    out.push(`${pad}${openTag(el)}/>`);
    return;
  }
  if (!opts.pretty) {
    out.push(`${openTag(el)}>`);
    for (const k of content) write(k, 0, opts, out);
    out.push(`</${el.tagName}>`);
    return;
  }
  out.push(`${pad}${openTag(el)}>`);
  for (const k of content) write(k, depth + 1, opts, out);
  out.push(`${pad}</${el.tagName}>`);
}

function serialise(input: string | Document, opts: WriteOptions): string {
  const doc = typeof input === 'string' ? parseXml(input) : input;
  const decl = typeof input === 'string' ? DECL_RE.exec(input)?.[1] : undefined;
  const out: string[] = [];
  if (decl) out.push(decl);
  for (const n of Array.from(doc.childNodes)) write(n, 0, opts, out);
  return opts.pretty ? out.join('\n') + '\n' : out.join('');
}

/** Indented XML that keeps every comment, CDATA section, PI and text run. */
export function prettyXml(
  input: string | Document,
  { indent = 2 }: { indent?: number | string } = {},
): string {
  return serialise(input, {
    pretty: true,
    indent: typeof indent === 'number' ? ' '.repeat(indent) : indent,
    comments: true,
  });
}

/** XML without whitespace between elements (and comments unless kept). */
export function minifyXml(
  input: string | Document,
  { keepComments = false }: { keepComments?: boolean } = {},
): string {
  return serialise(input, {
    pretty: false,
    indent: '',
    comments: keepComments,
  });
}

// JSON mapping

export interface XmlJsonOptions {
  /** Root element name when the value has no single top-level key. */
  root?: string;
  attrPrefix?: string;
  textKey?: string;
}

const NAME_RE = /^[A-Za-z_][\w.-]*(?::[A-Za-z_][\w.-]*)?$/;

function checkName(name: string): string {
  if (!NAME_RE.test(name) || /^xml/i.test(name))
    throw new ToolError(
      'INVALID_INPUT',
      `"${name}" is not a valid XML element or attribute name`,
    );
  return name;
}

/**
 * XML text for a JSON value. Keys starting with `attrPrefix` become
 * attributes, `textKey` holds text (a string or an array of runs), arrays
 * repeat their element and null is an empty element.
 */
export function jsonToXml(
  value: unknown,
  { root = 'root', attrPrefix = '@', textKey = '#text' }: XmlJsonOptions = {},
): string {
  const element = (name: string, v: unknown): string => {
    const tag = checkName(name);
    if (Array.isArray(v)) return v.map((item) => element(name, item)).join('');
    if (v === null || v === undefined) return `<${tag}/>`;
    if (typeof v !== 'object') return `<${tag}>${escText(String(v))}</${tag}>`;
    let attrs = '';
    let body = '';
    let text = '';
    for (const [k, child] of Object.entries(v)) {
      if (k === textKey) {
        text += (Array.isArray(child) ? child : [child])
          .map((t) => escText(String(t ?? '')))
          .join('');
      } else if (k.startsWith(attrPrefix)) {
        attrs += ` ${checkName(k.slice(attrPrefix.length))}="${escAttr(String(child ?? ''))}"`;
      } else body += element(k, child);
    }
    body += text;
    return body ? `<${tag}${attrs}>${body}</${tag}>` : `<${tag}${attrs}/>`;
  };
  const entries =
    value !== null && typeof value === 'object' && !Array.isArray(value)
      ? Object.entries(value)
      : [];
  if (
    entries.length === 1 &&
    !entries[0][0].startsWith(attrPrefix) &&
    entries[0][0] !== textKey &&
    !Array.isArray(entries[0][1])
  )
    return element(entries[0][0], entries[0][1]);
  return element(root, value);
}

/** Sets an own property, even one named `__proto__`. */
function put(o: Record<string, unknown>, k: string, v: unknown): void {
  Object.defineProperty(o, k, {
    value: v,
    writable: true,
    enumerable: true,
    configurable: true,
  });
}

/**
 * A JSON view of an XML document: `{ rootName: ... }`. Attributes become
 * `@name`, text runs `#text` (one string, or an array when interleaved),
 * repeated elements arrays. An element with only text is that string.
 */
export function xmlToJson(
  doc: Document,
  { attrPrefix = '@', textKey = '#text' }: Omit<XmlJsonOptions, 'root'> = {},
): Record<string, unknown> {
  const convert = (el: Element): unknown => {
    const out: Record<string, unknown> = {};
    for (const a of Array.from(el.attributes))
      put(out, attrPrefix + a.name, a.value);
    const texts: string[] = [];
    const repeated = new Set<string>();
    for (const k of Array.from(el.childNodes)) {
      if (k.nodeType === ELEMENT) {
        const child = k as Element;
        const name = child.tagName;
        const v = convert(child);
        if (!Object.hasOwn(out, name)) put(out, name, v);
        else if (repeated.has(name)) (out[name] as unknown[]).push(v);
        else {
          put(out, name, [out[name], v]);
          repeated.add(name);
        }
      } else if (k.nodeType === TEXT || k.nodeType === CDATA) {
        const raw = k.nodeValue ?? '';
        const t = k.nodeType === CDATA ? raw : raw.trim();
        if (t) texts.push(t);
      }
    }
    const keys = Object.keys(out);
    if (keys.length === 0)
      return texts.length === 0 ? '' : texts.length === 1 ? texts[0] : texts;
    if (texts.length) out[textKey] = texts.length === 1 ? texts[0] : texts;
    return out;
  };
  const root = doc.documentElement;
  return { [root.tagName]: convert(root) };
}
