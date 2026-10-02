import type { DiffSegment } from '../types';

/** One row of the inline view: an unchanged/unpaired line, or an edit. */
export type InlineRow =
  | { kind: 'single'; segment: DiffSegment }
  | { kind: 'pair'; original: DiffSegment; modified: DiffSegment };

/**
 * Groups line segments for the inline view. Each run of removed lines is
 * paired, in order, with the run of added lines right after it, so every
 * modified line sits under the original it replaced. Lines left over on
 * either side, and unchanged lines, stay single rows.
 */
export function pairInlineRows(segments: DiffSegment[]): InlineRow[] {
  const rows: InlineRow[] = [];
  let i = 0;
  while (i < segments.length) {
    if (!segments[i].removed) {
      rows.push({ kind: 'single', segment: segments[i] });
      i++;
      continue;
    }
    const removed: DiffSegment[] = [];
    while (i < segments.length && segments[i].removed)
      removed.push(segments[i++]);
    const added: DiffSegment[] = [];
    while (i < segments.length && segments[i].added) added.push(segments[i++]);
    const paired = Math.min(removed.length, added.length);
    for (let k = 0; k < paired; k++) {
      rows.push({ kind: 'pair', original: removed[k], modified: added[k] });
    }
    for (const segment of removed.slice(added.length)) {
      rows.push({ kind: 'single', segment });
    }
    for (const segment of added.slice(removed.length)) {
      rows.push({ kind: 'single', segment });
    }
  }
  return rows;
}
