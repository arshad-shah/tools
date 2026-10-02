import type { Box } from '@/pdf/doc/types';
import type { Interpretation } from '@/pdf/edit/content/interpreter';
import type { ParsedContent } from '@/pdf/edit/content/tokens';
import { applyEdits, type Edits } from './edits';
import { coveredBy } from './geometry';

const PATH_OPS = new Set(
  'm l c v y re h W W* S s f F f* B B* b b* n'.split(' '),
);

/**
 * Painted paths whose bbox lies inside the marks are dropped (construction
 * and paint ops); a clipping path that was also painted keeps its
 * construction and becomes `W n`. Paths that only intersect a mark stay:
 * they carry no text and the fill covers them.
 */
export function pathEdits(
  parsed: ParsedContent,
  interp: Interpretation,
  marks: readonly Box[],
): { edits: Edits; removed: number } {
  const edits: Edits = new Map();
  let removed = 0;
  for (const p of interp.paths) {
    if (!p.painted || !coveredBy(p.bbox, marks)) continue;
    removed++;
    if (p.clip) {
      edits.set(p.opEnd, [{ op: 'n', operands: [] }]);
      continue;
    }
    // Only path ops go: anything a producer slipped in between stays.
    for (let i = p.opStart; i <= p.opEnd; i++)
      if (PATH_OPS.has(parsed.ops[i].op)) edits.set(i, []);
  }
  return { edits, removed };
}

export function removePaths(
  parsed: ParsedContent,
  interp: Interpretation,
  marks: readonly Box[],
): { parsed: ParsedContent; removed: number } {
  const { edits, removed } = pathEdits(parsed, interp, marks);
  return { parsed: applyEdits(parsed, edits), removed };
}
