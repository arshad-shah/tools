import { ToolError } from '@/shared/lib/errors';
import type { Box, PageId } from '@/pdf/doc/types';
import type { PageTextItems } from '@/pdf/render';
import { pad, pageChars, union, type PageChar } from './glyphs';
import { PRESETS, type RedactPreset } from './patterns';

export interface SearchQuery {
  text: string;
  regex: boolean;
  caseSensitive: boolean;
  wholeWord: boolean;
  preset?: RedactPreset;
}

export interface SearchMatch {
  pageId: PageId;
  pageNumber: number;
  text: string;
  /** One rect per text line, padded 0.5pt. */
  rects: Box[];
  /** The match with up to 30 characters either side, line breaks as spaces. */
  context: string;
  /** Where `text` starts within `context`. */
  contextStart: number;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The regular expression a query runs; INVALID_INPUT for a bad pattern. */
export function queryPattern(q: SearchQuery): {
  re: RegExp;
  check?: (s: string) => boolean;
} {
  if (q.preset) {
    const p = PRESETS[q.preset];
    return {
      re: new RegExp(p.pattern.source, p.pattern.flags),
      check: p.check,
    };
  }
  if (!q.text) throw new ToolError('INVALID_INPUT', 'Type something to find');
  let source = q.regex ? q.text : escape(q.text);
  if (q.wholeWord) source = `\\b(?:${source})\\b`;
  try {
    return { re: new RegExp(source, q.caseSensitive ? 'g' : 'gi') };
  } catch (cause) {
    throw new ToolError('INVALID_INPUT', 'That search pattern is not valid', {
      cause,
    });
  }
}

function rectsFor(chars: PageChar[]): Box[] {
  const byLine = new Map<string, Box[]>();
  for (const c of chars) {
    if (!c.box || c.ch.trim() === '') continue;
    const list = byLine.get(c.line) ?? [];
    list.push(c.box);
    byLine.set(c.line, list);
  }
  return [...byLine.values()].map((boxes) => pad(union(boxes), 0.5));
}

/** A form field value on the page (its widget rect in page space). */
export interface SearchField {
  name: string;
  value: string;
  rect: Box;
}

/**
 * Matches in a page's form field values. A field value is not page text,
 * so it never shows up in the text search; a match marks the whole widget,
 * whose value apply then clears.
 */
function fieldMatches(
  page: { pageId: PageId; pageNumber: number; fields?: SearchField[] },
  re: RegExp,
  check?: (s: string) => boolean,
): SearchMatch[] {
  const out: SearchMatch[] = [];
  for (const f of page.fields ?? []) {
    re.lastIndex = 0;
    for (let m = re.exec(f.value); m; m = re.exec(f.value)) {
      if (m[0].length === 0) {
        re.lastIndex++;
        continue;
      }
      const found = m[0].trim();
      if (!found || (check && !check(found))) continue;
      const prefix = `Form field ${f.name}: `;
      out.push({
        pageId: page.pageId,
        pageNumber: page.pageNumber,
        text: found,
        rects: [pad(f.rect, 0.5)],
        context: prefix + f.value.replace(/\n/g, ' '),
        contextStart:
          prefix.length + m.index + (m[0].length - m[0].trimStart().length),
      });
      // One mark covers the widget: the first match is enough.
      break;
    }
  }
  return out;
}

export function searchPages(
  pages: {
    pageId: PageId;
    pageNumber: number;
    items: PageTextItems;
    fields?: SearchField[];
  }[],
  q: SearchQuery,
): SearchMatch[] {
  const { re, check } = queryPattern(q);
  const out: SearchMatch[] = [];
  for (const page of pages) {
    out.push(...fieldMatches(page, re, check));
    const chars = pageChars(page.items);
    const text = chars.map((c) => c.ch).join('');
    // Char index -> UTF-16 offset in `text` (Array.from split code points).
    const offsets: number[] = [];
    let at = 0;
    for (const c of chars) {
      offsets.push(at);
      at += c.ch.length;
    }
    offsets.push(at);
    const charAt = (offset: number) => {
      let lo = 0;
      let hi = offsets.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (offsets[mid] < offset) lo = mid + 1;
        else hi = mid;
      }
      return lo;
    };
    re.lastIndex = 0;
    for (let m = re.exec(text); m; m = re.exec(text)) {
      if (m[0].length === 0) {
        re.lastIndex++;
        continue;
      }
      // Trailing or leading white space a pattern may pick up is not marked.
      const lead = m[0].length - m[0].trimStart().length;
      const found = m[0].trim();
      if (!found || (check && !check(found))) continue;
      const start = m.index + lead;
      const end = start + found.length;
      const slice = chars.slice(charAt(start), charAt(end));
      const rects = rectsFor(slice);
      if (!rects.length) continue;
      const from = Math.max(0, start - 30);
      out.push({
        pageId: page.pageId,
        pageNumber: page.pageNumber,
        text: found,
        rects,
        context: text
          .slice(from, Math.min(text.length, end + 30))
          .replace(/\n/g, ' '),
        contextStart: start - from,
      });
    }
  }
  return out;
}
