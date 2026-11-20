import { ToolError } from '@/shared/lib/errors';

/** Most lines one range may cover (a typo such as 1-100000 stays cheap). */
const MAX_SPAN = 10_000;

/**
 * Parses line numbers to highlight: "3", "1, 4-6", "2 5". Throws a
 * ToolError naming the part it cannot read.
 */
export function parseLineRanges(text: string): Set<number> {
  const out = new Set<number>();
  for (const part of text.split(/[\s,;]+/).filter(Boolean)) {
    const m = /^(\d+)(?:-(\d+))?$/.exec(part);
    if (!m)
      throw new ToolError(
        'INVALID_INPUT',
        `"${part}" is not a line number or a range such as 4-6`,
      );
    const a = Number(m[1]);
    const b = m[2] === undefined ? a : Number(m[2]);
    const [from, to] = a <= b ? [a, b] : [b, a];
    if (from < 1)
      throw new ToolError('INVALID_INPUT', 'Line numbers start at 1');
    if (to - from > MAX_SPAN)
      throw new ToolError('INVALID_INPUT', `The range ${part} is too long`);
    for (let n = from; n <= to; n++) out.add(n);
  }
  return out;
}
