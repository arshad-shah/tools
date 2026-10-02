import type { TokenKind } from '@/shared/lib/syntax/tokenize';
import type {
  CodeMarker,
  CodeRange,
  LineDecorationKind,
  MarkerSeverity,
  RangeKind,
} from './types';

/** Class names and range maths shared by the line view's parts. */
export const TOKEN_CLASS: Record<TokenKind, string> = {
  key: 'text-syntax-key',
  string: 'text-syntax-string',
  number: 'text-syntax-number',
  boolean: 'text-syntax-boolean',
  null: 'text-syntax-null',
  punct: 'text-syntax-punct',
  comment: 'text-syntax-comment italic',
  keyword: 'text-syntax-keyword',
  tag: 'text-syntax-tag',
  attr: 'text-syntax-attr',
  fn: 'text-syntax-fn',
  regex: 'text-syntax-regex',
  plain: '',
};

export const RANGE_CLASS: Record<RangeKind, string> = {
  match: 'bg-match-soft',
  search: 'bg-match-soft',
  'match-active': 'bg-match-active-soft outline-1 outline-match',
  'diff-add': 'bg-diff-add-strong',
  'diff-del': 'bg-diff-del-strong',
};

export const RANGE_RANK: Record<RangeKind, number> = {
  'diff-add': 1,
  'diff-del': 1,
  search: 2,
  match: 3,
  'match-active': 4,
};

export const LINE_CLASS: Record<LineDecorationKind, string> = {
  added: 'bg-diff-add-soft',
  removed: 'bg-diff-del-soft',
  changed: 'bg-warning-soft',
  match: 'bg-match-soft',
  active: 'bg-surface-3',
};

export const UNDERLINE: Record<MarkerSeverity, string> = {
  error: 'underline decoration-wavy decoration-danger underline-offset-4',
  warning: 'underline decoration-wavy decoration-warning underline-offset-4',
  info: 'underline decoration-dotted decoration-info underline-offset-4',
};
export const SEVERITY_RANK: Record<MarkerSeverity, number> = {
  info: 1,
  warning: 2,
  error: 3,
};

export const mostSevere = (ms: readonly CodeMarker[]): CodeMarker =>
  ms.reduce((a, b) =>
    SEVERITY_RANK[b.severity] > SEVERITY_RANK[a.severity] ? b : a,
  );

/** Overlap queries over many ranges (sorted by start, prefix max of ends). */
export class RangeIndex {
  private sorted: CodeRange[];
  private maxEnd: number[];
  constructor(ranges: readonly CodeRange[]) {
    this.sorted = ranges
      .filter((r) => r.end > r.start)
      .sort((a, b) => a.start - b.start);
    let m = -1;
    this.maxEnd = this.sorted.map((r) => (m = Math.max(m, r.end)));
  }
  /** Ranges overlapping `[from, to)`, clipped and shifted to start at `from`. */
  query(from: number, to: number): CodeRange[] {
    const s = this.sorted;
    let lo = 0;
    let hi = s.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (s[mid].start < to) lo = mid + 1;
      else hi = mid;
    }
    const out: CodeRange[] = [];
    for (let j = lo - 1; j >= 0 && this.maxEnd[j] > from; j--) {
      const r = s[j];
      if (r.end > from)
        out.push({
          start: Math.max(r.start, from) - from,
          end: Math.min(r.end, to) - from,
          kind: r.kind,
        });
    }
    return out;
  }
}

export interface Underline {
  start: number;
  end: number;
  severity: MarkerSeverity;
}

/** The characters a marker underlines: the word at its column, else the line. */
export function markerSpan(text: string, m: CodeMarker): Underline {
  const first = text.length - text.trimStart().length;
  if (!m.column)
    return { start: first, end: text.length, severity: m.severity };
  const start = Math.min(
    Math.max(0, m.column - 1),
    Math.max(0, text.length - 1),
  );
  let end = start + 1;
  while (end < text.length && /\w/.test(text[end])) end++;
  return {
    start,
    end: Math.min(end, Math.max(text.length, 1)),
    severity: m.severity,
  };
}

export const SEVERITY_WORD: Record<MarkerSeverity, string> = {
  error: 'Error',
  warning: 'Warning',
  info: 'Note',
};

/** "Error on line 3: Unexpected token" */
export const describeMarker = (m: CodeMarker) =>
  `${SEVERITY_WORD[m.severity]} on line ${m.line}: ${m.message}`;
