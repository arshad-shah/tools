import {
  LANGUAGES,
  languageForFile,
  tokenize,
  type LanguageId,
} from '@/shared/lib/syntax/tokenize';

export interface OutlineItem {
  depth: number;
  text: string;
  /** 1-based source line. */
  line: number;
  id: string;
}

export interface RenderResult {
  html: string;
  /** Images that would load from the network (blocked until opted in). */
  remoteImages: number;
  outline: OutlineItem[];
}

/** Top-level constructs that render as one element each. */
const BLOCKS = new Set([
  'atxHeading',
  'setextHeading',
  'table',
  'listUnordered',
  'listOrdered',
  'blockQuote',
  'codeFenced',
  'codeIndented',
  'thematicBreak',
]);

const VOID = new Set(['hr', 'br', 'img', 'input']);

const decode = (s: string) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) =>
      String.fromCodePoint(parseInt(n, 16)),
    )
    .replace(/&amp;/g, '&');

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Heading text to an id: lower case, words joined by hyphens. */
export const headingSlug = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}+/gu, '')
    .match(/[\p{L}\p{N}_]+/gu)
    ?.join('-') ?? 'section';

const languageOf = (name: string): LanguageId | null => {
  const id = name.toLowerCase();
  if (LANGUAGES.some((l) => l.id === id)) return id as LanguageId;
  const byExt = languageForFile(`x.${id}`);
  return byExt === 'plain' ? null : byExt;
};

/** Source line of each top-level element, in document order. */
async function blockLines(md: string): Promise<number[]> {
  const [{ parse, postprocess, preprocess }, { gfm }] = await Promise.all([
    import('micromark'),
    import('micromark-extension-gfm'),
  ]);
  const events = postprocess(
    parse({ extensions: [gfm()] })
      .document()
      .write(preprocess()(md, undefined, true)),
  );
  const lines: number[] = [];
  let depth = 0;
  let inContent = false;
  for (const [kind, token] of events) {
    if (kind === 'enter') {
      if (depth === 0) {
        if (BLOCKS.has(token.type)) lines.push(token.start.line);
        inContent = token.type === 'content';
      } else if (depth === 1 && inContent && token.type === 'paragraph')
        lines.push(token.start.line);
      depth++;
    } else depth--;
  }
  return lines;
}

/** Adds `data-line` to each top-level element, in order. */
function tagLines(html: string, lines: number[]): string {
  let depth = 0;
  let next = 0;
  return html.replace(
    /<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g,
    (tag, close: string, name: string, attrs: string, self: string) => {
      const lower = name.toLowerCase();
      if (close) {
        depth--;
        return tag;
      }
      const top = depth === 0;
      if (!self && !VOID.has(lower)) depth++;
      if (!top || next >= lines.length || lower === 'section') return tag;
      return `<${name} data-line="${lines[next++]}"${attrs}${self}>`;
    },
  );
}

/** Syntax-highlights fenced code with the shared tokenisers. */
function highlightCode(html: string): string {
  return html.replace(
    /<pre><code class="language-([^"]+)">([\s\S]*?)<\/code><\/pre>/g,
    (whole, lang: string, body: string) => {
      const id = languageOf(lang);
      if (!id) return whole;
      const text = decode(body);
      const lines = text.split('\n');
      const tokens = tokenize(id, text);
      const out = lines.map((line, i) => {
        let at = 0;
        let s = '';
        for (const t of tokens[i] ?? []) {
          if (t.start > at) s += escape(line.slice(at, t.start));
          const piece = escape(line.slice(t.start, t.end));
          s +=
            t.kind === 'plain'
              ? piece
              : `<span class="tok-${t.kind}">${piece}</span>`;
          at = t.end;
        }
        return s + escape(line.slice(at));
      });
      return `<pre><code class="language-${lang}">${out.join('\n')}</code></pre>`;
    },
  );
}

/** Unique ids on headings, and the outline. */
function headingIds(html: string): { html: string; outline: OutlineItem[] } {
  const seen = new Map<string, number>();
  const outline: OutlineItem[] = [];
  const out = html.replace(
    /<h([1-6])( data-line="(\d+)")?>([\s\S]*?)<\/h\1>/g,
    (
      _,
      depth: string,
      lineAttr: string | undefined,
      line: string | undefined,
      inner: string,
    ) => {
      const text = decode(inner.replace(/<[^>]+>/g, '')).trim();
      const base = headingSlug(text);
      const n = seen.get(base) ?? 0;
      seen.set(base, n + 1);
      const id = n === 0 ? base : `${base}-${n}`;
      outline.push({ depth: Number(depth), text, line: Number(line ?? 0), id });
      return `<h${depth} id="${id}"${lineAttr ?? ''}>${inner}</h${depth}>`;
    },
  );
  return { html: out, outline };
}

const BACK_ARROW = String.fromCodePoint(0x21a9);

/**
 * GFM to HTML (spec §9.2) with micromark: raw HTML in the source is escaped
 * (no sanitiser needed), code fences are highlighted, headings get unique
 * ids, top-level blocks carry their source line for scroll sync, and remote
 * images are counted so the preview can block them.
 */
export async function renderMarkdown(md: string): Promise<RenderResult> {
  const [{ micromark }, { gfm, gfmHtml }] = await Promise.all([
    import('micromark'),
    import('micromark-extension-gfm'),
  ]);
  let html = micromark(md, {
    allowDangerousHtml: false,
    extensions: [gfm()],
    htmlExtensions: [gfmHtml()],
  });
  // Footnote back links use an arrow glyph; product text uses words.
  html = html.split(`>${BACK_ARROW}`).join('>back');
  html = highlightCode(html);
  html = tagLines(html, await blockLines(md));
  const withIds = headingIds(html);
  const remoteImages = [
    ...withIds.html.matchAll(/<img [^>]*?src="((?:https?:)?\/\/[^"]+)"/gi),
  ].length;
  return { html: withIds.html, remoteImages, outline: withIds.outline };
}
