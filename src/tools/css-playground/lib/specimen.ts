/**
 * Builds sample markup for a stylesheet: one element for every selector,
 * nested the way the selector's combinators say, so pasted CSS can be seen
 * without writing HTML. Pure and DOM-free (runs in the text worker).
 */

/** The parts of a css-tree selector node this module reads. */
export interface SelectorPart {
  type: string;
  name?: string | { name?: string };
  matcher?: string | null;
  value?: { type: string; value?: string; name?: string } | null;
}

interface Compound {
  tag: string | null;
  id: string | null;
  classes: string[];
  attrs: [string, string][];
}

interface SpecNode {
  key: string;
  compound: Compound;
  children: SpecNode[];
  text: string | null;
}

const VOID = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
]);
/** Tags the document already has: their rules apply to the frame itself. */
const DOCUMENT_TAGS = new Set(['html', 'body', 'head']);
const STATE_ATTRS: Record<string, string> = {
  checked: 'checked',
  disabled: 'disabled',
  required: 'required',
  'read-only': 'readonly',
  open: 'open',
};
/** Elements per specimen, so a framework stylesheet stays responsive. */
export const SPECIMEN_LIMIT = 400;

const escapeText = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeAttr = (s: string) => escapeText(s).replace(/"/g, '&quot;');
const VALID_NAME = /^[a-zA-Z][\w-]*$/;

const nameOf = (part: SelectorPart): string =>
  typeof part.name === 'string' ? part.name : (part.name?.name ?? '');

const emptyCompound = (): Compound => ({
  tag: null,
  id: null,
  classes: [],
  attrs: [],
});

const signature = (c: Compound) =>
  [
    c.tag ?? '',
    c.id ? `#${c.id}` : '',
    ...[...c.classes].sort().map((k) => `.${k}`),
    ...c.attrs.map(([k, v]) => `[${k}=${v}]`).sort(),
  ].join('');

function applyPart(c: Compound, part: SelectorPart): void {
  const name = nameOf(part);
  switch (part.type) {
    case 'TypeSelector':
      if (name !== '*' && VALID_NAME.test(name)) c.tag = name.toLowerCase();
      break;
    case 'IdSelector':
      c.id = name;
      break;
    case 'ClassSelector':
      if (!c.classes.includes(name)) c.classes.push(name);
      break;
    case 'AttributeSelector': {
      if (!VALID_NAME.test(name)) break;
      const v = part.value;
      const value = v ? (v.value ?? v.name ?? '') : '';
      c.attrs.push([name, value]);
      break;
    }
    case 'PseudoClassSelector': {
      const attr = STATE_ATTRS[name];
      if (attr) c.attrs.push([attr, '']);
      break;
    }
  }
}

/**
 * Splits a selector's parts into compounds and the combinators between
 * them. Document tags (html, body, :root) drop out: their rules already
 * apply to the preview's own document.
 */
export function compoundsOf(
  parts: SelectorPart[],
): { compounds: Compound[]; combinators: string[] } | null {
  const compounds: Compound[] = [];
  const combinators: string[] = [];
  let current = emptyCompound();
  let touched = false;
  let documentLevel = false;
  const flush = (combinator: string | null) => {
    if (touched && !documentLevel) {
      if (compounds.length > combinators.length)
        combinators.push(combinator ?? ' ');
      compounds.push(current);
    }
    current = emptyCompound();
    touched = false;
    documentLevel = false;
  };
  let pending: string | null = null;
  for (const part of parts) {
    if (part.type === 'Combinator') {
      flush(pending);
      pending = nameOf(part) || ' ';
      continue;
    }
    if (part.type === 'NestingSelector') return null;
    const name = nameOf(part);
    if (
      (part.type === 'TypeSelector' && DOCUMENT_TAGS.has(name.toLowerCase())) ||
      (part.type === 'PseudoClassSelector' && name === 'root')
    )
      documentLevel = true;
    applyPart(current, part);
    touched = true;
  }
  flush(pending);
  return compounds.length ? { compounds, combinators } : null;
}

const KNOWN_ATTR_TAGS: Record<string, string> = {
  type: 'input',
  href: 'a',
  placeholder: 'input',
  src: 'img',
};

function tagFor(c: Compound): string {
  if (c.tag) return c.tag;
  for (const [k] of c.attrs) if (KNOWN_ATTR_TAGS[k]) return KNOWN_ATTR_TAGS[k];
  return 'div';
}

function open(c: Compound): string {
  const tag = tagFor(c);
  const attrs: string[] = [];
  if (c.id) attrs.push(`id="${escapeAttr(c.id)}"`);
  if (c.classes.length)
    attrs.push(`class="${escapeAttr(c.classes.join(' '))}"`);
  for (const [k, v] of c.attrs)
    attrs.push(v === '' ? k : `${k}="${escapeAttr(v)}"`);
  if (tag === 'a' && !c.attrs.some(([k]) => k === 'href'))
    attrs.push('href="#"');
  return `<${tag}${attrs.length ? ` ${attrs.join(' ')}` : ''}>`;
}

function render(node: SpecNode, depth: number): string {
  const tag = tagFor(node.compound);
  const pad = '  '.repeat(depth);
  const start = open(node.compound);
  if (VOID.has(tag)) {
    if (tag === 'input' && node.text)
      return `${pad}${start.replace(/>$/, ` placeholder="${escapeAttr(node.text)}">`)}`;
    if (tag === 'img' && node.text)
      return `${pad}${start.replace(/>$/, ` alt="${escapeAttr(node.text)}">`)}`;
    return `${pad}${start}`;
  }
  let inner = node.children.map((c) => render(c, depth + 1));
  let text = node.text ? escapeText(node.text) : '';
  // Lists and selects take their label as the first item.
  if (!inner.length && (tag === 'ul' || tag === 'ol')) {
    inner = [text || 'First item', 'Second item', 'Third item'].map(
      (t) => `${pad}  <li>${t}</li>`,
    );
    text = '';
  }
  if (!inner.length && tag === 'select') {
    inner = [`${pad}  <option>${text || 'Option'}</option>`];
    text = '';
  }
  if (!inner.length) return `${pad}${start}${text}</${tag}>`;
  const lead = text ? [`${pad}  ${text}`] : [];
  return [`${pad}${start}`, ...lead, ...inner, `${pad}</${tag}>`].join('\n');
}

/**
 * Collects selectors into a tree (shared ancestors merge), then renders it.
 * Siblings (+ and ~) sit next to the element before them.
 */
export class SpecimenBuilder {
  private root: SpecNode = {
    key: '',
    compound: emptyCompound(),
    children: [],
    text: null,
  };
  private count = 0;
  truncated = false;

  add(parts: SelectorPart[], label: string): void {
    const split = compoundsOf(parts);
    if (!split) return;
    const { compounds, combinators } = split;
    let parent = this.root;
    let last: SpecNode | null = null;
    for (let i = 0; i < compounds.length; i++) {
      const c = compounds[i];
      const combinator = i === 0 ? ' ' : combinators[i - 1];
      // A sibling shares the previous element's parent.
      if (i > 0 && (combinator === ' ' || combinator === '>') && last)
        parent = last;
      const key = signature(c);
      let node = parent.children.find((n) => n.key === key) ?? null;
      if (!node) {
        if (this.count >= SPECIMEN_LIMIT) {
          this.truncated = true;
          return;
        }
        node = { key, compound: c, children: [], text: null };
        parent.children.push(node);
        this.count++;
      }
      last = node;
    }
    if (last && last.text === null) last.text = label;
  }

  html(): string {
    return this.root.children.map((n) => render(n, 0)).join('\n');
  }
}
