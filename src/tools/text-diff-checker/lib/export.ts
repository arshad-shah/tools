import type { DiffSegment, DiffSettings, DiffStatistics } from '../types';

/** The JSON written by "Export"; `now` is a millisecond timestamp. */
export function buildDiffExport(
  segments: DiffSegment[],
  stats: DiffStatistics | null,
  settings: DiffSettings,
  now: number,
) {
  return {
    timestamp: new Date(now).toISOString(),
    statistics: stats,
    settings,
    results: segments.map((s) => ({
      text: s.text,
      type: s.type || (s.added ? 'added' : s.removed ? 'removed' : 'unchanged'),
      lineNumber: s.lineNumber,
    })),
  };
}
