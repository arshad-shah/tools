import { diffArrays, diffChars, diffWordsWithSpace } from 'diff';

export type Granularity = 'line' | 'word' | 'char';

export interface DiffOptions {
  granularity: Granularity;
  ignoreWhitespace: boolean;
  ignoreCase: boolean;
  ignoreBlankLines: boolean;
  trimTrailing: boolean;
}

export const DEFAULT_DIFF_OPTIONS: DiffOptions = {
  granularity: 'word',
  ignoreWhitespace: false,
  ignoreCase: false,
  ignoreBlankLines: false,
  trimTrailing: false,
};

/** Half-open offsets into one line's text. */
export interface Range {
  start: number;
  end: number;
}

export interface Hunk {
  kind: 'equal' | 'add' | 'del' | 'change';
  /** First original (1-based) line on each side; for an empty side, the line it sits before. */
  leftStart: number;
  /** Original 1-based line numbers, before any normalisation. */
  leftLines: number[];
  rightStart: number;
  rightLines: number[];
  /** Per paired line of a `change` hunk (word or char granularity). */
  intraline?: { left: Range[]; right: Range[] }[];
}

export interface DiffStats {
  added: number;
  removed: number;
  changed: number;
  unchanged: number;
}

export interface DiffResult {
  hunks: Hunk[];
  stats: DiffStats;
}

/** Splits into lines; a trailing newline does not add an empty last line. */
export function splitLines(text: string): string[] {
  if (text === '') return [];
  const lines = text.split(/\r?\n/);
  if (lines[lines.length - 1] === '') lines.pop();
  return lines;
}

function keyOf(line: string, o: DiffOptions): string {
  let k = line;
  if (o.trimTrailing) k = k.trimEnd();
  if (o.ignoreWhitespace) k = k.replace(/\s+/g, ' ').trim();
  if (o.ignoreCase) k = k.toLowerCase();
  return k;
}

/** Lines kept for comparison, with their original 1-based numbers. */
function prepare(lines: string[], o: DiffOptions) {
  const keys: string[] = [];
  const numbers: number[] = [];
  lines.forEach((line, i) => {
    const key = keyOf(line, o);
    if (o.ignoreBlankLines && key.trim() === '') return;
    keys.push(key);
    numbers.push(i + 1);
  });
  return { keys, numbers };
}

function ranges(
  left: string,
  right: string,
  o: DiffOptions,
): { left: Range[]; right: Range[] } {
  const parts =
    o.granularity === 'char'
      ? diffChars(left, right, { ignoreCase: o.ignoreCase })
      : diffWordsWithSpace(left, right, { ignoreCase: o.ignoreCase });
  const out = { left: [] as Range[], right: [] as Range[] };
  let l = 0;
  let r = 0;
  for (const p of parts) {
    const n = p.value.length;
    if (p.added) {
      out.right.push({ start: r, end: r + n });
      r += n;
    } else if (p.removed) {
      out.left.push({ start: l, end: l + n });
      l += n;
    } else {
      l += n;
      r += n;
    }
  }
  return out;
}

/**
 * Line diff of two texts (spec §8.1). Normalisation options only change how
 * lines compare; every line number in the result refers to the original
 * inputs, so ignored blank lines never shift the numbering.
 */
export function computeDiff(
  left: string,
  right: string,
  opts: Partial<DiffOptions> = {},
): DiffResult {
  const o = { ...DEFAULT_DIFF_OPTIONS, ...opts };
  const leftText = splitLines(left);
  const rightText = splitLines(right);
  const a = prepare(leftText, o);
  const b = prepare(rightText, o);
  const changes = diffArrays(a.keys, b.keys);

  const hunks: Hunk[] = [];
  const stats: DiffStats = { added: 0, removed: 0, changed: 0, unchanged: 0 };
  let i = 0;
  let j = 0;
  // Where an empty side sits: the original line after the last one used.
  const nextLeft = () =>
    i < a.numbers.length ? a.numbers[i] : leftText.length + 1;
  const nextRight = () =>
    j < b.numbers.length ? b.numbers[j] : rightText.length + 1;

  for (let c = 0; c < changes.length; c++) {
    const ch = changes[c];
    const n = ch.count ?? ch.value.length;
    if (!ch.added && !ch.removed) {
      hunks.push({
        kind: 'equal',
        leftStart: nextLeft(),
        leftLines: a.numbers.slice(i, i + n),
        rightStart: nextRight(),
        rightLines: b.numbers.slice(j, j + n),
      });
      stats.unchanged += n;
      i += n;
      j += n;
    } else if (ch.removed) {
      const next = changes[c + 1];
      const leftStart = nextLeft();
      const leftLines = a.numbers.slice(i, i + n);
      i += n;
      if (next?.added) {
        const m = next.count ?? next.value.length;
        const rightStart = nextRight();
        const rightLines = b.numbers.slice(j, j + m);
        j += m;
        c++;
        const hunk: Hunk = {
          kind: 'change',
          leftStart,
          leftLines,
          rightStart,
          rightLines,
        };
        if (o.granularity !== 'line') {
          const pairs = Math.min(leftLines.length, rightLines.length);
          hunk.intraline = [];
          for (let p = 0; p < pairs; p++)
            hunk.intraline.push(
              ranges(
                leftText[leftLines[p] - 1],
                rightText[rightLines[p] - 1],
                o,
              ),
            );
        }
        hunks.push(hunk);
        const paired = Math.min(n, m);
        stats.changed += paired;
        stats.removed += n - paired;
        stats.added += m - paired;
      } else {
        hunks.push({
          kind: 'del',
          leftStart,
          leftLines,
          rightStart: nextRight(),
          rightLines: [],
        });
        stats.removed += n;
      }
    } else {
      hunks.push({
        kind: 'add',
        leftStart: nextLeft(),
        leftLines: [],
        rightStart: nextRight(),
        rightLines: b.numbers.slice(j, j + n),
      });
      stats.added += n;
      j += n;
    }
  }
  return { hunks, stats };
}

/** True when the diff has no add, del or change hunks. */
export const isIdentical = (r: DiffResult): boolean =>
  r.hunks.every((h) => h.kind === 'equal');
