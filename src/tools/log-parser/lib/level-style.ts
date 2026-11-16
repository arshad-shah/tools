import type { BadgeProps, ColorTokens } from '@arshad-shah/cynosure';
import { NO_LEVEL } from './filter';
import { LEVELS } from './model';

/** Levels in the order the filter chips show them. */
export const LEVEL_ORDER: readonly string[] = [...LEVELS, NO_LEVEL];

type Tone = NonNullable<BadgeProps['tone']>;
/** A level badge's tone (the timeline colours its bars the same). */
export type LevelTone = Tone;

const TONE: Record<string, Tone> = {
  fatal: 'danger',
  error: 'danger',
  warn: 'warning',
  info: 'info',
  success: 'success',
};

export const levelTone = (level: string | undefined): Tone =>
  TONE[level ?? NO_LEVEL] ?? 'neutral';

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

/** A level's bar colour: the colour of its badge's tone. */
export function levelColour(tone: LevelTone, colors: ColorTokens): string {
  switch (tone) {
    case 'danger':
      return colors.danger;
    case 'warning':
      return colors.warning;
    case 'info':
      return colors.info;
    case 'success':
      return colors.success;
    case 'accent':
      return colors.accent;
    default:
      return colors.muted;
  }
}
