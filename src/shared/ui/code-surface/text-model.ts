import type { CodeFold } from './types';

/** Lines of a text, their start offsets and the widest line (tabs as `tabSize`). */
export interface Lines {
  lines: string[];
  starts: number[];
  maxLength: number;
}

export function splitLines(value: string, tabSize: number): Lines {
  const lines = value.split('\n');
  const starts = new Array<number>(lines.length);
  let offset = 0;
  let maxLength = 0;
  for (let i = 0; i < lines.length; i++) {
    starts[i] = offset;
    const line = lines[i];
    offset += line.length + 1;
    let len = line.length;
    if (line.includes('\t'))
      len += (line.split('\t').length - 1) * (tabSize - 1);
    if (len > maxLength) maxLength = len;
  }
  return { lines, starts, maxLength };
}

/** Index of the line containing `offset` (binary search over `starts`). */
export function lineIndexAt(starts: readonly number[], offset: number): number {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= offset) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

export interface FoldRow {
  index: number;
  /** 0-based, inclusive. */
  from: number;
  to: number;
  label: string;
}

/** Display rows a fold takes: two, so its button meets the 24 px target size. */
export const FOLD_ROWS = 2;

/**
 * Display rows: one per line, except each fold's lines collapse into
 * FOLD_ROWS rows holding its button. Without folds rows and lines are the
 * same (no per-row storage).
 */
export interface RowMap {
  count: number;
  /** The line shown in `row`, or -1 for a fold row. */
  lineAt(row: number): number;
  /** The fold whose first row is `row`. */
  foldAt(row: number): FoldRow | undefined;
  /** The row showing `line` (a fold row for a hidden line). */
  rowOfLine(line: number): number;
  hasFolds: boolean;
}

export function buildRowMap(
  lineCount: number,
  folds: readonly CodeFold[] | undefined,
): RowMap {
  const valid = (folds ?? [])
    .map((f, index) => ({
      index,
      from: Math.max(0, Math.floor(f.fromLine) - 1),
      to: Math.min(lineCount - 1, Math.floor(f.toLine) - 1),
      label: f.label,
    }))
    .filter((f) => f.to >= f.from)
    .sort((a, b) => a.from - b.from);
  const kept: FoldRow[] = [];
  for (const f of valid)
    if (!kept.length || f.from > kept[kept.length - 1].to) kept.push(f);
  if (!kept.length)
    return {
      count: lineCount,
      lineAt: (r) => r,
      foldAt: () => undefined,
      rowOfLine: (l) => l,
      hasFolds: false,
    };
  const rows: number[] = [];
  const rowOf = new Int32Array(lineCount);
  let k = 0;
  for (let line = 0; line < lineCount; line++) {
    const f = kept[k];
    if (f && line === f.from) {
      for (let j = f.from; j <= f.to; j++) rowOf[j] = rows.length;
      for (let j = 0; j < FOLD_ROWS; j++) rows.push(-(k + 1));
      line = f.to;
      k++;
    } else {
      rowOf[line] = rows.length;
      rows.push(line);
    }
  }
  return {
    count: rows.length,
    lineAt: (r) => (rows[r] >= 0 ? rows[r] : -1),
    foldAt: (r) =>
      rows[r] < 0 && rows[r - 1] !== rows[r] ? kept[-rows[r] - 1] : undefined,
    rowOfLine: (l) => rowOf[Math.min(lineCount - 1, Math.max(0, l))],
    hasFolds: true,
  };
}

/**
 * The textarea's text and offset maps for a folded view: hidden lines are
 * replaced by FOLD_ROWS empty lines under the fold button.
 */
export interface Projection {
  text: string;
  toView(offset: number): number;
  fromView(offset: number): number;
}

export function project(model: Lines, rows: RowMap, value: string): Projection {
  if (!rows.hasFolds)
    return { text: value, toView: (o) => o, fromView: (o) => o };
  const parts: string[] = [];
  const viewStarts: number[] = [];
  let offset = 0;
  for (let r = 0; r < rows.count; r++) {
    const line = rows.lineAt(r);
    const text = line < 0 ? '' : model.lines[line];
    viewStarts.push(offset);
    parts.push(text);
    offset += text.length + 1;
  }
  return {
    text: parts.join('\n'),
    toView(o) {
      const line = lineIndexAt(model.starts, o);
      const row = rows.rowOfLine(line);
      return rows.lineAt(row) < 0
        ? viewStarts[row]
        : viewStarts[row] + (o - model.starts[line]);
    },
    fromView(o) {
      const row = lineIndexAt(viewStarts, o);
      const line = rows.lineAt(row);
      if (line < 0) {
        let first = row;
        while (first > 0 && !rows.foldAt(first)) first--;
        return model.starts[rows.foldAt(first)?.from ?? 0];
      }
      return model.starts[line] + (o - viewStarts[row]);
    },
  };
}

export interface FindResult {
  matches: { start: number; end: number }[];
  error?: string;
  /** More matches exist than were collected. */
  capped: boolean;
}

export const FIND_CAP = 10_000;

/** Literal (case-insensitive) or regex matches of `query` in `text`. */
export function findMatches(
  text: string,
  query: string,
  regex: boolean,
): FindResult {
  const matches: { start: number; end: number }[] = [];
  if (!query) return { matches, capped: false };
  if (!regex) {
    const hay = text.toLowerCase();
    const needle = query.toLowerCase();
    let i = hay.indexOf(needle);
    while (i >= 0 && matches.length < FIND_CAP) {
      matches.push({ start: i, end: i + needle.length });
      i = hay.indexOf(needle, i + needle.length);
    }
    return { matches, capped: i >= 0 };
  }
  let re: RegExp;
  try {
    re = new RegExp(query, 'gimu');
  } catch {
    return { matches, capped: false, error: 'Invalid pattern' };
  }
  for (const m of text.matchAll(re)) {
    if (!m[0]) continue;
    if (matches.length >= FIND_CAP) return { matches, capped: true };
    matches.push({ start: m.index, end: m.index + m[0].length });
  }
  return { matches, capped: false };
}
