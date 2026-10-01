import { ToolError } from '@/shared/lib/errors';
import {
  everyNPages,
  formatRange,
  parsePageRanges,
  type PageRange,
} from '@/pdf/edit';

export type SplitMode = 'ranges' | 'every-n' | 'individual' | 'selection';

interface PlanInput {
  pageCount: number;
  rangeText: string;
  everyN: number;
  selected: number[];
}

/** For 'selection' the ranges are extracted into ONE file; otherwise one file per range. */
export function planSplit(
  mode: SplitMode,
  { pageCount, rangeText, everyN, selected }: PlanInput,
): PageRange[] {
  switch (mode) {
    case 'ranges':
      return parsePageRanges(rangeText, pageCount);
    case 'every-n':
      return everyNPages(pageCount, everyN);
    case 'individual':
      return everyNPages(pageCount, 1);
    case 'selection': {
      if (selected.length === 0)
        throw new ToolError('INVALID_INPUT', 'Select at least one page');
      const sorted = [...new Set(selected)].sort((a, b) => a - b);
      const runs: PageRange[] = [];
      for (const i of sorted) {
        const last = runs[runs.length - 1];
        if (last && i === last.end + 1) last.end = i;
        else runs.push({ start: i, end: i });
      }
      return runs;
    }
  }
}

/** Bounded filename label: explicit runs when few, otherwise a count. */
export function selectionLabel(ranges: PageRange[]): string {
  if (ranges.length <= 3) return ranges.map(formatRange).join('_');
  const count = ranges.reduce((n, r) => n + (r.end - r.start + 1), 0);
  return `${count}-selected`;
}
