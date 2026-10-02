import React from 'react';
import { cn } from '@/shared/lib/cn';
import type { Token } from '@/shared/lib/syntax/tokenize';
import {
  markerSpan,
  RANGE_CLASS,
  RANGE_RANK,
  SEVERITY_RANK,
  TOKEN_CLASS,
  UNDERLINE,
} from './decor';
import type { CodeMarker, CodeRange } from './types';

function topAt<T>(
  items: readonly T[],
  i: number,
  rank: (t: T) => number,
  span: (t: T) => [number, number],
) {
  let best: T | undefined;
  for (const it of items) {
    const [a, b] = span(it);
    if (a <= i && i < b && (!best || rank(it) > rank(best))) best = it;
  }
  return best;
}

interface LineProps {
  text: string;
  tokens: readonly Token[];
  ranges: readonly CodeRange[];
  markers: readonly CodeMarker[];
}

/**
 * Props equality for the line memo: tokens and markers are cached per line
 * (same array while unchanged); ranges are rebuilt per render, so compare
 * them by value.
 */
export function sameLine(a: LineProps, b: LineProps): boolean {
  if (
    a.text !== b.text ||
    a.tokens !== b.tokens ||
    a.markers !== b.markers ||
    a.ranges.length !== b.ranges.length
  )
    return false;
  return a.ranges.every((r, i) => {
    const s = b.ranges[i];
    return r.start === s.start && r.end === s.end && r.kind === s.kind;
  });
}

/**
 * One line's text as token spans, with ranges wrapped in `mark` elements
 * (one per contiguous range, spanning token boundaries) and marker
 * underlines. `ranges` and `markers` are relative to the line.
 */
function LineContentImpl({ text, tokens, ranges, markers }: LineProps) {
  if (!text) return null;
  if (!tokens.length && !ranges.length && !markers.length) return <>{text}</>;
  const underlines = markers.map((m) => markerSpan(text, m));
  const cuts = new Set<number>([0, text.length]);
  for (const t of tokens) cuts.add(t.start).add(t.end);
  for (const r of ranges) cuts.add(r.start).add(r.end);
  for (const u of underlines) cuts.add(u.start).add(u.end);
  const points = [...cuts]
    .filter((p) => p >= 0 && p <= text.length)
    .sort((a, b) => a - b);

  const groups: { range?: CodeRange; parts: React.ReactNode[] }[] = [];
  let ti = 0;
  for (let k = 0; k < points.length - 1; k++) {
    const a = points[k];
    const b = points[k + 1];
    while (ti < tokens.length && tokens[ti].end <= a) ti++;
    const token = tokens[ti] && tokens[ti].start <= a ? tokens[ti] : undefined;
    const range = topAt(
      ranges,
      a,
      (r) => RANGE_RANK[r.kind],
      (r) => [r.start, r.end],
    );
    const under = topAt(
      underlines,
      a,
      (u) => SEVERITY_RANK[u.severity],
      (u) => [u.start, u.end],
    );
    const cls = cn(
      token && TOKEN_CLASS[token.kind],
      under && UNDERLINE[under.severity],
    );
    const part = cls ? (
      <span key={a} className={cls}>
        {text.slice(a, b)}
      </span>
    ) : (
      text.slice(a, b)
    );
    const last = groups[groups.length - 1];
    if (last && last.range === range) last.parts.push(part);
    else groups.push({ range, parts: [part] });
  }
  return (
    <>
      {groups.map((g, i) =>
        g.range ? (
          <mark
            key={i}
            className={cn('rounded-xs text-inherit', RANGE_CLASS[g.range.kind])}
          >
            {g.parts}
          </mark>
        ) : (
          <React.Fragment key={i}>{g.parts}</React.Fragment>
        ),
      )}
    </>
  );
}

/**
 * Memoised: a parent re-render (a settings change elsewhere in the tool)
 * leaves unchanged lines alone, which matters in wrap mode where every line
 * is mounted.
 */
export const LineContent = React.memo(LineContentImpl, sameLine);
