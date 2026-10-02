import { splitLines, type DiffResult } from './engine';

export type HunkChoice = 'left' | 'right';

const span = (lines: number[]): [number, number] | null =>
  lines.length === 0 ? null : [lines[0], lines[lines.length - 1]];

/**
 * The merged text: the left side, with each hunk chosen `right` (keyed by
 * its index in `result.hunks`) replaced by the right side's lines. Unchosen
 * hunks keep the left. Line endings and the final newline follow the left.
 */
export function applyChoices(
  result: DiffResult,
  texts: { left: string; right: string },
  choices: ReadonlyMap<number, HunkChoice>,
): string {
  const left = splitLines(texts.left);
  const right = splitLines(texts.right);
  const out: string[] = [];
  let next = 1;
  result.hunks.forEach((h, index) => {
    if (h.kind === 'equal' || choices.get(index) !== 'right') return;
    const l = span(h.leftLines);
    const r = span(h.rightLines);
    const from = l ? l[0] : h.leftStart;
    while (next < from) out.push(left[next++ - 1]);
    if (r) for (let n = r[0]; n <= r[1]; n++) out.push(right[n - 1]);
    if (l) next = l[1] + 1;
  });
  while (next <= left.length) out.push(left[next++ - 1]);
  const eol = texts.left.includes('\r\n') ? '\r\n' : '\n';
  const trailing = /\r?\n$/.test(texts.left) && out.length > 0 ? eol : '';
  return out.join(eol) + trailing;
}
