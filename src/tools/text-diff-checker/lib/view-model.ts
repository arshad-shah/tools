import { diffChars, diffWordsWithSpace } from 'diff';
import type { DiffContext, DiffView } from '../settings';
import { splitLines, type DiffResult, type Granularity } from './engine';

export type LineKind = 'added' | 'removed' | 'changed';
export type RangeKind = 'diff-add' | 'diff-del';

export interface LineDecoration {
  /** 1-based row in the rendered surface. */
  line: number;
  kind: LineKind;
}
/** Absolute offsets into the surface text (rows joined with `\n`). */
export interface TextRange {
  start: number;
  end: number;
  kind: RangeKind;
}

export interface Fold {
  /** Stable index into the full fold list, for `expanded`. */
  index: number;
  fromLine: number;
  toLine: number;
  hidden: number;
}

/** One rendered surface: rows and their original line numbers. */
export interface Surface {
  lines: string[];
  /** Original 1-based line per row (null for alignment padding). */
  numbers: (number | null)[];
  decorations: LineDecoration[];
  ranges: TextRange[];
}

export interface ViewModel {
  /** Split view: left surface; unified and inline: the only surface. */
  left: Surface;
  /** Split view only (aligned row for row with `left`). */
  right: Surface | null;
  folds: Fold[];
  /** First row of each change, in order (for n and p navigation). */
  changeAnchors: number[];
}

export interface ViewOptions {
  view: DiffView;
  context: DiffContext;
  /** Indexes of folds the user opened. */
  expanded: ReadonlySet<number>;
  granularity?: Granularity;
}

interface Row {
  text: string;
  number: number | null;
  kind: LineKind | null;
  ranges?: { start: number; end: number; kind: RangeKind }[];
  /** Whether this row belongs to an unchanged stretch (foldable). */
  equal: boolean;
}

const emptySurface = (): Surface => ({
  lines: [],
  numbers: [],
  decorations: [],
  ranges: [],
});

function toSurface(rows: Row[]): Surface {
  const s = emptySurface();
  let offset = 0;
  rows.forEach((r, i) => {
    s.lines.push(r.text);
    s.numbers.push(r.number);
    if (r.kind) s.decorations.push({ line: i + 1, kind: r.kind });
    for (const x of r.ranges ?? [])
      s.ranges.push({
        start: offset + x.start,
        end: offset + x.end,
        kind: x.kind,
      });
    offset += r.text.length + 1;
  });
  return s;
}

/** The inline view's merged row for a changed pair of lines. */
function mergedRow(a: string, b: string, granularity: Granularity): Row {
  const parts =
    granularity === 'char' ? diffChars(a, b) : diffWordsWithSpace(a, b);
  let text = '';
  const ranges: Row['ranges'] = [];
  for (const p of parts) {
    const start = text.length;
    text += p.value;
    if (p.added) ranges.push({ start, end: text.length, kind: 'diff-add' });
    else if (p.removed)
      ranges.push({ start, end: text.length, kind: 'diff-del' });
  }
  return { text, number: null, kind: 'changed', ranges, equal: false };
}

const contiguous = (lines: number[]): number[] =>
  lines.length < 2
    ? lines
    : Array.from(
        { length: lines[lines.length - 1] - lines[0] + 1 },
        (_, i) => lines[0] + i,
      );

/** Unchanged stretches beyond `context` rows from a change. */
function computeFolds(
  equal: boolean[],
  context: DiffContext,
  expanded: ReadonlySet<number>,
): Fold[] {
  if (context === 'all') return [];
  const all: Omit<Fold, 'index'>[] = [];
  let i = 0;
  while (i < equal.length) {
    if (!equal[i]) {
      i++;
      continue;
    }
    let j = i;
    while (j < equal.length && equal[j]) j++;
    // Rows i..j-1 (0-based) are unchanged.
    const from = i === 0 ? i : i + context;
    const to = j === equal.length ? j - 1 : j - 1 - context;
    if (to >= from)
      all.push({ fromLine: from + 1, toLine: to + 1, hidden: to - from + 1 });
    i = j;
  }
  return all
    .map((f, index) => ({ ...f, index }))
    .filter((f) => !expanded.has(f.index));
}

/**
 * Rows, decorations, intraline ranges, folds and change anchors for the
 * three diff views (spec §8.1). Split rows are aligned (padding rows have a
 * null number) so the two surfaces scroll together line for line.
 */
export function buildViewModel(
  result: DiffResult,
  texts: { left: string; right: string },
  opts: ViewOptions,
): ViewModel {
  const leftText = splitLines(texts.left);
  const rightText = splitLines(texts.right);
  const lrows: Row[] = [];
  const rrows: Row[] = [];
  const rows: Row[] = [];
  const anchors: number[] = [];
  const split = opts.view === 'split';
  const lineOf = (side: string[], n: number) => side[n - 1] ?? '';
  const pad = (): Row => ({ text: '', number: null, kind: null, equal: false });

  // Lines skipped by the comparison (ignored blank lines) render as
  // unchanged rows in place, so the original numbering stays continuous.
  let nextLeft = 1;
  let nextRight = 1;
  const catchUp = (leftUpTo: number, rightUpTo: number) => {
    while (nextLeft < leftUpTo || nextRight < rightUpTo) {
      const l = nextLeft < leftUpTo ? nextLeft++ : null;
      const r = nextRight < rightUpTo ? nextRight++ : null;
      if (split) {
        lrows.push(
          l === null
            ? pad()
            : { text: lineOf(leftText, l), number: l, kind: null, equal: true },
        );
        rrows.push(
          r === null
            ? pad()
            : {
                text: lineOf(rightText, r),
                number: r,
                kind: null,
                equal: true,
              },
        );
      } else if (r !== null)
        rows.push({
          text: lineOf(rightText, r),
          number: r,
          kind: null,
          equal: true,
        });
      else if (l !== null)
        rows.push({
          text: lineOf(leftText, l),
          number: l,
          kind: null,
          equal: true,
        });
    }
  };

  for (const hunk of result.hunks) {
    // Ignored blank lines inside a change render as part of it.
    const h =
      hunk.kind === 'equal'
        ? hunk
        : {
            ...hunk,
            leftLines: contiguous(hunk.leftLines),
            rightLines: contiguous(hunk.rightLines),
          };
    catchUp(h.leftLines[0] ?? h.leftStart, h.rightLines[0] ?? h.rightStart);
    const rowCount = () => (split ? lrows.length : rows.length);
    if (h.kind === 'equal') {
      h.leftLines.forEach((l, k) => {
        const r = h.rightLines[k];
        catchUp(l, r);
        nextLeft = l + 1;
        nextRight = r + 1;
        if (split) {
          lrows.push({
            text: lineOf(leftText, l),
            number: l,
            kind: null,
            equal: true,
          });
          rrows.push({
            text: lineOf(rightText, r),
            number: r,
            kind: null,
            equal: true,
          });
        } else
          rows.push({
            text: lineOf(rightText, r),
            number: r,
            kind: null,
            equal: true,
          });
      });
    } else {
      anchors.push(rowCount() + 1);
      const n = Math.max(h.leftLines.length, h.rightLines.length);
      const leftKind: LineKind = h.kind === 'change' ? 'changed' : 'removed';
      const rightKind: LineKind = h.kind === 'change' ? 'changed' : 'added';
      if (split) {
        for (let k = 0; k < n; k++) {
          const l = h.leftLines[k];
          const r = h.rightLines[k];
          const intra = h.intraline?.[k];
          lrows.push(
            l === undefined
              ? pad()
              : {
                  text: lineOf(leftText, l),
                  number: l,
                  kind: r === undefined ? 'removed' : leftKind,
                  ranges: intra?.left.map((x) => ({
                    ...x,
                    kind: 'diff-del' as const,
                  })),
                  equal: false,
                },
          );
          rrows.push(
            r === undefined
              ? pad()
              : {
                  text: lineOf(rightText, r),
                  number: r,
                  kind: l === undefined ? 'added' : rightKind,
                  ranges: intra?.right.map((x) => ({
                    ...x,
                    kind: 'diff-add' as const,
                  })),
                  equal: false,
                },
          );
        }
      } else if (opts.view === 'unified' || h.kind !== 'change') {
        h.leftLines.forEach((l, k) =>
          rows.push({
            text: lineOf(leftText, l),
            number: l,
            kind: 'removed',
            ranges: h.intraline?.[k]?.left.map((x) => ({
              ...x,
              kind: 'diff-del' as const,
            })),
            equal: false,
          }),
        );
        h.rightLines.forEach((r, k) =>
          rows.push({
            text: lineOf(rightText, r),
            number: r,
            kind: 'added',
            ranges: h.intraline?.[k]?.right.map((x) => ({
              ...x,
              kind: 'diff-add' as const,
            })),
            equal: false,
          }),
        );
      } else {
        for (let k = 0; k < n; k++) {
          const l = h.leftLines[k];
          const r = h.rightLines[k];
          if (l !== undefined && r !== undefined)
            rows.push({
              ...mergedRow(
                lineOf(leftText, l),
                lineOf(rightText, r),
                opts.granularity ?? 'word',
              ),
              number: r,
            });
          else if (l !== undefined)
            rows.push({
              text: lineOf(leftText, l),
              number: l,
              kind: 'removed',
              equal: false,
            });
          else
            rows.push({
              text: lineOf(rightText, r!),
              number: r!,
              kind: 'added',
              equal: false,
            });
        }
      }
    }
    const lastL = h.leftLines[h.leftLines.length - 1];
    const lastR = h.rightLines[h.rightLines.length - 1];
    if (lastL !== undefined) nextLeft = lastL + 1;
    if (lastR !== undefined) nextRight = lastR + 1;
  }
  catchUp(leftText.length + 1, rightText.length + 1);

  const foldBasis = split ? lrows : rows;
  return {
    left: toSurface(split ? lrows : rows),
    right: split ? toSurface(rrows) : null,
    folds: computeFolds(
      foldBasis.map((r, i) => r.equal && (!split || rrows[i].equal)),
      opts.context,
      opts.expanded,
    ),
    changeAnchors: anchors,
  };
}

/** The anchor after (`next`) or before the given row, wrapping around. */
export function stepAnchor(
  anchors: number[],
  current: number,
  dir: 'next' | 'prev',
): number | null {
  if (anchors.length === 0) return null;
  if (dir === 'next') return anchors.find((a) => a > current) ?? anchors[0];
  for (let i = anchors.length - 1; i >= 0; i--)
    if (anchors[i] < current) return anchors[i];
  return anchors[anchors.length - 1];
}
