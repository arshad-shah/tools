import type { Token, TokenKind } from '@/shared/lib/syntax/tokenize';

/**
 * Lays out a code image: the window, its title bar, the gutter and every
 * coloured run of text, in CSS pixels. Pure: text is measured through the
 * `measure` function given, so the canvas and SVG painters share one layout
 * and tests can use a fixed-width measure.
 */

export interface CodeImageOptions {
  fontSize: number;
  /** Line height as a multiple of the font size. */
  lineHeight: number;
  /** Space around the window. */
  padding: number;
  chrome: boolean;
  title: string;
  lineNumbers: boolean;
  /** 1-based line numbers to highlight. */
  highlight: ReadonlySet<number>;
  /** Total image width, or 'auto' to fit the longest line. */
  width: number | 'auto';
  /** Long lines wrap onto more rows, or are clipped at the edge. */
  overflow: 'wrap' | 'clip';
}

export interface Run {
  x: number;
  text: string;
  kind: TokenKind;
}

export interface Row {
  /** Top of the row. */
  y: number;
  /** Text baseline. */
  baseline: number;
  /** The 1-based line number, or null on a wrapped continuation. */
  lineNo: number | null;
  highlighted: boolean;
  runs: Run[];
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CodeImageLayout {
  width: number;
  height: number;
  window: Box & { radius: number };
  chrome: {
    height: number;
    dots: { cx: number; cy: number; r: number }[];
    title: { x: number; baseline: number; text: string } | null;
  } | null;
  /** Right edge of the line numbers; null without them. */
  gutterRight: number | null;
  /** Where code is drawn; text past it is clipped. */
  code: Box;
  rows: Row[];
  fontSize: number;
  rowHeight: number;
}

/** Narrowest and widest image `auto` makes. */
export const AUTO_MIN_WIDTH = 320;
export const AUTO_MAX_WIDTH = 1920;

/** Splits a line's tokens into runs that cover every character. */
export function lineRuns(
  line: string,
  tokens: readonly Token[],
): Omit<Run, 'x'>[] {
  const runs: Omit<Run, 'x'>[] = [];
  let at = 0;
  const push = (end: number, kind: TokenKind) => {
    if (end > at) runs.push({ text: line.slice(at, end), kind });
    at = Math.max(at, end);
  };
  for (const t of [...tokens].sort((x, y) => x.start - y.start)) {
    const start = Math.max(t.start, at);
    const end = Math.min(t.end, line.length);
    if (start > at) push(start, 'plain');
    if (end > start) push(end, t.kind);
  }
  push(line.length, 'plain');
  return runs;
}

/** Characters of `text` as code points (one measure each). */
const chars = (text: string) => Array.from(text);

/** Where to break a row of `cs` that overflows after `fit` characters. */
function breakAt(cs: string[], fit: number): number {
  const n = Math.max(1, fit);
  for (let i = n; i > n / 2; i--) if (cs[i - 1] === ' ') return i;
  return n;
}

/** Per-character advances for one line, using a cached measure. */
function advances(
  cs: string[],
  measure: (s: string) => number,
  cache: Map<string, number>,
) {
  return cs.map((c) => {
    let w = cache.get(c);
    if (w === undefined) cache.set(c, (w = measure(c)));
    return w;
  });
}

export function layoutCodeImage(
  lines: readonly string[],
  tokens: readonly (readonly Token[])[],
  opts: CodeImageOptions,
  measure: (text: string) => number,
): CodeImageLayout {
  const fs = opts.fontSize;
  const rowHeight = Math.round(fs * opts.lineHeight);
  const inset = Math.round(fs * 1.5);
  const chromeHeight = opts.chrome ? Math.round(fs * 2.75) : 0;
  const cache = new Map<string, number>();
  const digit = measure('0');
  const gutter = opts.lineNumbers
    ? Math.ceil(String(Math.max(1, lines.length)).length * digit + fs * 1.5)
    : 0;
  const P = opts.padding;

  const perLine = lines.map((line, i) => {
    const runs = lineRuns(line, tokens[i] ?? []);
    const cs = runs.flatMap((r) =>
      chars(r.text).map((c) => ({ c, kind: r.kind })),
    );
    const ws = advances(
      cs.map((x) => x.c),
      measure,
      cache,
    );
    return { cs, ws, width: ws.reduce((a, b) => a + b, 0) };
  });
  const longest = Math.ceil(Math.max(0, ...perLine.map((l) => l.width)));
  const titleWidth =
    opts.chrome && opts.title ? Math.ceil(measure(opts.title)) : 0;
  const frame = 2 * P + 2 * inset + gutter;

  let width: number;
  if (opts.width === 'auto') {
    const natural = Math.max(frame + longest, 2 * P + titleWidth + fs * 10);
    width = Math.min(
      AUTO_MAX_WIDTH,
      Math.max(AUTO_MIN_WIDTH, Math.ceil(natural)),
    );
  } else width = Math.max(frame + fs * 4, Math.round(opts.width));
  const codeWidth = width - frame;

  const codeTop =
    P + chromeHeight + (opts.chrome ? Math.round(inset * 0.5) : inset);
  const codeLeft = P + inset + gutter;
  const rows: Row[] = [];
  const ascent = Math.round((rowHeight - fs) / 2 + fs * 0.8);

  perLine.forEach((line, i) => {
    const lineNo = i + 1;
    const highlighted = opts.highlight.has(lineNo);
    // Wrapped rows hang under the line's own indentation (up to half the row).
    let indent = 0;
    for (let j = 0; j < line.cs.length && line.cs[j].c === ' '; j++)
      indent += line.ws[j];
    if (indent > codeWidth / 2) indent = 0;
    let start = 0;
    let first = true;
    do {
      let end = line.cs.length;
      const left = first ? 0 : indent;
      if (opts.overflow === 'wrap') {
        let used = 0;
        for (let j = start; j < line.cs.length; j++) {
          if (used + line.ws[j] > codeWidth - left + 0.01 && j > start) {
            end =
              start +
              breakAt(
                line.cs.slice(start, j).map((x) => x.c),
                j - start,
              );
            break;
          }
          used += line.ws[j];
        }
      }
      const runs: Run[] = [];
      let x = codeLeft + left;
      for (let j = start; j < end; j++) {
        const { c, kind } = line.cs[j];
        const last = runs[runs.length - 1];
        if (last && last.kind === kind) last.text += c;
        else runs.push({ x, text: c, kind });
        x += line.ws[j];
      }
      const y = codeTop + rows.length * rowHeight;
      rows.push({
        y,
        baseline: y + ascent,
        lineNo: first ? lineNo : null,
        highlighted,
        runs,
      });
      first = false;
      start = end;
    } while (start < line.cs.length);
  });

  const codeHeight = rows.length * rowHeight;
  const height = codeTop + codeHeight + inset + P;
  const window = {
    x: P,
    y: P,
    width: width - 2 * P,
    height: height - 2 * P,
    radius: Math.round(fs * 0.75),
  };
  const r = Math.max(3, Math.round(fs * 0.4));
  const chrome = opts.chrome
    ? {
        height: chromeHeight,
        dots: [0, 1, 2].map((k) => ({
          cx: P + inset + r + k * (r * 3.4),
          cy: P + chromeHeight / 2,
          r,
        })),
        title: opts.title
          ? {
              x: P + window.width / 2,
              baseline: Math.round(P + chromeHeight / 2 + fs * 0.35),
              text: opts.title,
            }
          : null,
      }
    : null;

  return {
    width,
    height,
    window,
    chrome,
    gutterRight: opts.lineNumbers ? codeLeft - Math.round(fs * 1.5) : null,
    code: { x: codeLeft, y: codeTop, width: codeWidth, height: codeHeight },
    rows,
    fontSize: fs,
    rowHeight,
  };
}
