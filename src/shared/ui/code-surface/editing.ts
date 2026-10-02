import type { LanguageId } from '@/shared/lib/syntax/tokenize';

/**
 * Pure text edits for CodeSurface. Each returns the replacement of
 * `[start, end)` by `text` and the selection afterwards, so the surface can
 * apply it through the browser's undo stack where available.
 */
export interface Edit {
  start: number;
  end: number;
  text: string;
  selStart: number;
  selEnd: number;
}

/** Line comment prefix per language; languages without one are absent. */
export const LINE_COMMENT: Partial<Record<LanguageId, string>> = {
  js: '//',
  ts: '//',
  sql: '--',
  yaml: '#',
  http: '#',
};

const lineStartAt = (value: string, i: number) =>
  value.lastIndexOf('\n', i - 1) + 1;

/**
 * The block of whole lines a selection touches. A selection that ends at
 * the start of a line (after its newline) does not include that line.
 */
function lineBlock(value: string, s: number, e: number) {
  const start = lineStartAt(value, s);
  const last = e > s && value[e - 1] === '\n' ? e - 1 : e;
  const nl = value.indexOf('\n', last);
  const end = nl < 0 ? value.length : nl;
  return { start, end, lines: value.slice(start, end).split('\n') };
}

/** Prefixes every non-empty selected line with `tabSize` spaces. */
export function indentLines(
  value: string,
  s: number,
  e: number,
  tabSize: number,
): Edit {
  const block = lineBlock(value, s, e);
  const pad = ' '.repeat(tabSize);
  let added = 0;
  let firstAdded = 0;
  const text = block.lines
    .map((line, i) => {
      if (!line) return line;
      added += tabSize;
      if (i === 0) firstAdded = tabSize;
      return pad + line;
    })
    .join('\n');
  return {
    start: block.start,
    end: block.end,
    text,
    selStart: s === block.start ? s : s + firstAdded,
    selEnd: e + added,
  };
}

/** Removes up to `tabSize` leading spaces (or one tab) per selected line. */
export function outdentLines(
  value: string,
  s: number,
  e: number,
  tabSize: number,
): Edit | null {
  const block = lineBlock(value, s, e);
  let removed = 0;
  let firstRemoved = 0;
  const text = block.lines
    .map((line, i) => {
      let n = 0;
      if (line[0] === '\t') n = 1;
      else while (n < tabSize && line[n] === ' ') n++;
      removed += n;
      if (i === 0) firstRemoved = n;
      return line.slice(n);
    })
    .join('\n');
  if (removed === 0) return null;
  const selStart = Math.max(block.start, s - firstRemoved);
  return {
    start: block.start,
    end: block.end,
    text,
    selStart,
    selEnd: Math.max(selStart, e - removed),
  };
}

/**
 * Tab: indents the lines of a multi-line selection, otherwise replaces the
 * selection with spaces up to the next tab stop.
 */
export function tabEdit(
  value: string,
  s: number,
  e: number,
  tabSize: number,
): Edit {
  if (value.slice(s, e).includes('\n'))
    return indentLines(value, s, e, tabSize);
  const col = s - lineStartAt(value, s);
  const n = tabSize - (col % tabSize);
  return {
    start: s,
    end: e,
    text: ' '.repeat(n),
    selStart: s + n,
    selEnd: s + n,
  };
}

const OPEN_TO_CLOSE: Record<string, string> = {
  '(': ')',
  '[': ']',
  '{': '}',
  '"': '"',
  "'": "'",
};

/**
 * Enter: a newline that keeps the current line's indentation. Between an
 * empty bracket pair the closing bracket moves to its own line and the
 * caret lands on an indented blank line.
 */
export function newlineEdit(
  value: string,
  s: number,
  e: number,
  tabSize: number,
): Edit {
  const start = lineStartAt(value, s);
  const indent = /^[ \t]*/.exec(value.slice(start, s))?.[0] ?? '';
  const before = value[s - 1];
  const after = value[e];
  if (before && '([{'.includes(before) && after === OPEN_TO_CLOSE[before]) {
    const inner = `\n${indent}${' '.repeat(tabSize)}`;
    const caret = s + inner.length;
    return {
      start: s,
      end: e,
      text: `${inner}\n${indent}`,
      selStart: caret,
      selEnd: caret,
    };
  }
  const text = `\n${indent}`;
  return {
    start: s,
    end: e,
    text,
    selStart: s + text.length,
    selEnd: s + text.length,
  };
}

/**
 * Typing an opening bracket or quote inserts its pair when nothing is
 * selected and the next character is whitespace or the end of the text.
 * Quotes are not paired straight after a word character (`don't`).
 */
export function autoPairEdit(
  value: string,
  s: number,
  e: number,
  ch: string,
): Edit | null {
  const close = OPEN_TO_CLOSE[ch];
  if (!close || s !== e) return null;
  const next = value[e];
  if (next !== undefined && !/\s/.test(next)) return null;
  if ((ch === '"' || ch === "'") && /\w/.test(value[s - 1] ?? '')) return null;
  return { start: s, end: e, text: ch + close, selStart: s + 1, selEnd: s + 1 };
}

export const isClosingChar = (ch: string) => ')]}"\''.includes(ch);

/**
 * Comments out the selected lines with `token`, or removes the comment when
 * every non-empty selected line already has it.
 */
export function toggleCommentEdit(
  value: string,
  s: number,
  e: number,
  token: string,
): Edit {
  const block = lineBlock(value, s, e);
  const filled = block.lines.filter((l) => l.trim());
  const indentOf = (l: string) => /^[ \t]*/.exec(l)?.[0].length ?? 0;
  const commented =
    filled.length > 0 && filled.every((l) => l.trimStart().startsWith(token));
  const col = filled.length ? Math.min(...filled.map(indentOf)) : 0;
  let firstDelta = 0;
  let total = 0;
  const text = block.lines
    .map((line, i) => {
      if (!line.trim()) return line;
      let next: string;
      if (commented) {
        const at = indentOf(line);
        const rest = line.slice(at + token.length);
        next =
          line.slice(0, at) + (rest.startsWith(' ') ? rest.slice(1) : rest);
      } else next = `${line.slice(0, col)}${token} ${line.slice(col)}`;
      const delta = next.length - line.length;
      if (i === 0) firstDelta = delta;
      total += delta;
      return next;
    })
    .join('\n');
  const selStart = Math.max(block.start, s + firstDelta);
  return {
    start: block.start,
    end: block.end,
    text,
    selStart,
    selEnd: s === e ? selStart : Math.max(selStart, e + total),
  };
}
