import type { PageTextItems, TextItemGeom } from '@/pdf/render';

/** First line of every conversion: the structure is a guess (spec 7.2). */
export const MARKDOWN_NOTICE =
  '<!-- Converted by tools: best-effort structure, check before use -->';

export interface MarkdownOptions {
  /** 0-based page indices to convert, in document order; all when omitted. */
  pages?: number[];
  /** A line at least this many times the body size is a heading (1.25). */
  headingRatio?: number;
}

/**
 * One page's text items. `geometry` is reserved for the flat-form cell
 * detector (P5-C): once it lands, its cells become GFM tables. Until then
 * the field is accepted and ignored, so tables come out as paragraphs.
 */
export interface MarkdownPage {
  items: PageTextItems;
  geometry?: unknown;
}

interface Line {
  text: string;
  size: number;
  /** Baseline, PDF user space (larger is higher on the page). */
  y: number;
}

type Role = 'heading' | 'list' | 'body';

interface Block {
  role: Role;
  /** Heading level or list marker ('- ' or 'n. '). */
  prefix: string;
  text: string;
}

// Bullet glyphs third-party PDFs use, recognised by code point only:
// bullet, black circle, white bullet, triangular bullet.
const BULLETS = new Set([0x2022, 0x25cf, 0x25e6, 0x2023]);
const ORDERED = /^(\d{1,4})[.)]\s+(.*)$/;
const DASHED = /^[-*]\s+(.*)$/;

const sizeOf = (it: TextItemGeom) =>
  Math.hypot(it.transform[2], it.transform[3]) || it.height || 0;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Items into lines: baselines within half a font size share a line. */
function linesOf(page: PageTextItems): Line[] {
  const items = page.items.filter((it) => it.str.trim() !== '');
  const sorted = [...items].sort(
    (a, b) =>
      b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4],
  );
  const groups: { y: number; size: number; items: TextItemGeom[] }[] = [];
  for (const it of sorted) {
    const size = sizeOf(it);
    const y = it.transform[5];
    const line = groups.find(
      (g) => Math.abs(g.y - y) <= 0.5 * Math.max(size, g.size),
    );
    if (line) {
      line.items.push(it);
      line.size = Math.max(line.size, size);
    } else groups.push({ y, size, items: [it] });
  }
  return groups
    .sort((a, b) => b.y - a.y)
    .map((g) => {
      const row = g.items.sort((a, b) => a.transform[4] - b.transform[4]);
      let text = '';
      let end = -Infinity;
      for (const it of row) {
        const x = it.transform[4];
        const gap = x - end;
        if (
          text &&
          gap > 0.2 * sizeOf(it) &&
          !/\s$/.test(text) &&
          !/^\s/.test(it.str)
        )
          text += ' ';
        text += it.str;
        end = Math.max(end, x + it.width);
      }
      return { text: text.replace(/\s+/g, ' ').trim(), size: g.size, y: g.y };
    });
}

/** Body size: the median item size, weighted by characters. */
function bodySize(pages: PageTextItems[]): number {
  const sizes: number[] = [];
  for (const p of pages)
    for (const it of p.items) {
      const n = it.str.trim().length;
      const s = sizeOf(it);
      // Cap the weight so one long run cannot dominate memory.
      for (let i = 0; i < Math.min(n, 200); i++) sizes.push(s);
    }
  return median(sizes);
}

const bucket = (size: number) => Math.round(size * 2) / 2;

/** A list marker at the start of a line, as Markdown, and the rest. */
function listMarker(text: string): { prefix: string; rest: string } | null {
  const first = text.codePointAt(0);
  if (first !== undefined && BULLETS.has(first))
    return {
      prefix: '- ',
      rest: text.slice(String.fromCodePoint(first).length).trim(),
    };
  const ordered = ORDERED.exec(text);
  if (ordered) return { prefix: `${Number(ordered[1])}. `, rest: ordered[2] };
  const dashed = DASHED.exec(text);
  if (dashed) return { prefix: '- ', rest: dashed[1] };
  return null;
}

/** Appends a line, joining a word hyphenated across the break. */
function joinLine(text: string, next: string): string {
  if (!text) return next;
  if (/\p{L}-$/u.test(text) && /^\p{Ll}/u.test(next))
    return text.slice(0, -1) + next;
  return `${text} ${next}`;
}

/** Text that Markdown would otherwise read as structure. */
const escapeBody = (text: string) =>
  text.replace(/^(#{1,6}\s|>|[-*+]\s|\d{1,4}[.)]\s)/, '\\$1');

function blocksOf(
  lines: Line[],
  headingLevel: (size: number) => number,
): Block[] {
  const blocks: Block[] = [];
  const sameSize = lines
    .slice(1)
    .flatMap((l, i) =>
      bucket(l.size) === bucket(lines[i].size) ? [lines[i].y - l.y] : [],
    )
    .filter((g) => g > 0);
  // Pages of one-line paragraphs would make the paragraph gap the median:
  // the estimate never exceeds 1.6 times the body size.
  const sizes = lines.map((l) => l.size);
  const lineHeight = Math.min(
    median(sameSize) || 1.2 * median(sizes),
    1.6 * median(sizes),
  );
  let open: Block | null = null;
  let prev: Line | null = null;
  for (const line of lines) {
    const level = headingLevel(line.size);
    const marker = level ? null : listMarker(line.text);
    const gap = prev ? prev.y - line.y : Infinity;
    const role: Role = level ? 'heading' : marker ? 'list' : 'body';
    const continues =
      open !== null &&
      prev !== null &&
      gap <= 1.2 * lineHeight &&
      !marker &&
      bucket(prev.size) === bucket(line.size) &&
      (role === 'body' ? open.role !== 'heading' : open.role === 'heading');
    if (continues && open) open.text = joinLine(open.text, line.text);
    else {
      open = {
        role,
        prefix: level ? `${'#'.repeat(level)} ` : (marker?.prefix ?? ''),
        text: marker ? marker.rest : line.text,
      };
      blocks.push(open);
    }
    prev = line;
  }
  return blocks;
}

/**
 * PDF text as Markdown (spec 7.2): lines from baseline clusters, blocks from
 * vertical gaps, headings from font-size clusters, lists from leading
 * markers, words hyphenated across lines joined. Best effort by design: the
 * output starts with a notice that says so.
 */
export function toMarkdown(
  pages: readonly MarkdownPage[],
  o: MarkdownOptions = {},
): string {
  const ratio = o.headingRatio ?? 1.25;
  const chosen = (o.pages ?? pages.map((_, i) => i))
    .filter((i) => i >= 0 && i < pages.length)
    .map((i) => pages[i].items);
  const body = bodySize(chosen);
  const pageLines = chosen.map(linesOf);
  const headingSizes = [
    ...new Set(
      pageLines
        .flat()
        .filter((l) => body > 0 && l.size >= ratio * body)
        .map((l) => bucket(l.size)),
    ),
  ].sort((a, b) => b - a);
  const headingLevel = (size: number) => {
    if (!(body > 0) || size < ratio * body) return 0;
    return bucket(size) === headingSizes[0] ? 1 : 2;
  };

  const blocks = pageLines.flatMap((lines) => blocksOf(lines, headingLevel));
  const out: string[] = [];
  blocks.forEach((b, i) => {
    const line =
      b.role === 'body' ? escapeBody(b.text) : `${b.prefix}${b.text}`;
    // Items of one list sit on consecutive lines; everything else is a block.
    const sep =
      b.role === 'list' && blocks[i - 1]?.role === 'list' ? '\n' : '\n\n';
    out.push(i === 0 ? line : sep + line);
  });
  const text = out.join('');
  return text ? `${MARKDOWN_NOTICE}\n\n${text}\n` : `${MARKDOWN_NOTICE}\n`;
}
