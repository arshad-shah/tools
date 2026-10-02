import type { DiffOptions, Granularity } from './lib/engine';
import type { DiffMode } from './settings';

export const DIFF_SHARE_VERSION = 1;

export type SharedDiffOptions = DiffOptions & {
  mode: DiffMode;
  sortKeys: boolean;
};

export interface DiffShare {
  v: 1;
  left: string;
  right: string;
  opts: SharedDiffOptions;
}

const GRANULARITIES: Granularity[] = ['line', 'word', 'char'];
const MODES: DiffMode[] = ['text', 'json', 'csv', 'ignore-order'];
const FLAGS = [
  'ignoreWhitespace',
  'ignoreCase',
  'ignoreBlankLines',
  'trimTrailing',
  'sortKeys',
] as const;

/** Validates a shared Text Diff state (spec §4.2); null when it does not fit. */
export function parseDiffShare(state: unknown): DiffShare | null {
  if (typeof state !== 'object' || state === null) return null;
  const s = state as Record<string, unknown>;
  if (s.v !== 1 || typeof s.left !== 'string' || typeof s.right !== 'string')
    return null;
  const o = s.opts as Record<string, unknown> | null;
  if (typeof o !== 'object' || o === null) return null;
  if (!GRANULARITIES.includes(o.granularity as Granularity)) return null;
  if (!MODES.includes(o.mode as DiffMode)) return null;
  if (!FLAGS.every((f) => typeof o[f] === 'boolean')) return null;
  return {
    v: 1,
    left: s.left,
    right: s.right,
    opts: {
      granularity: o.granularity as Granularity,
      mode: o.mode as DiffMode,
      ignoreWhitespace: o.ignoreWhitespace as boolean,
      ignoreCase: o.ignoreCase as boolean,
      ignoreBlankLines: o.ignoreBlankLines as boolean,
      trimTrailing: o.trimTrailing as boolean,
      sortKeys: o.sortKeys as boolean,
    },
  };
}
