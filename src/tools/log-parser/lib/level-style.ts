import type { StatusTone } from '@/shared/ui';
import { NO_LEVEL } from './filter';
import { LEVELS } from './model';

/** Levels in the order the filter chips show them. */
export const LEVEL_ORDER: readonly string[] = [...LEVELS, NO_LEVEL];

const TONE: Record<string, StatusTone> = {
  fatal: 'danger',
  error: 'danger',
  warn: 'warning',
  info: 'info',
  success: 'accent',
};

export const levelTone = (level: string | undefined): StatusTone =>
  TONE[level ?? NO_LEVEL] ?? 'muted';

const LABEL: Record<string, string> = {
  fatal: 'Fatal',
  error: 'Error',
  warn: 'Warn',
  info: 'Info',
  debug: 'Debug',
  trace: 'Trace',
  success: 'Success',
  [NO_LEVEL]: 'No level',
};

export const levelLabel = (level: string | undefined): string =>
  LABEL[level ?? NO_LEVEL] ?? level ?? 'No level';

/** Chip order: known levels first, then any other level the log has. */
export const orderLevels = (counts: Record<string, number>): string[] => [
  ...LEVEL_ORDER.filter((l) => counts[l]),
  ...Object.keys(counts)
    .filter((l) => !LEVEL_ORDER.includes(l) && counts[l])
    .sort(),
];
