import { createToolSettings } from '@/shared/lib/tool-settings';

export type DateSettings = {
  /** Working days, Sunday 0 to Saturday 6. */
  workweek: boolean[];
  /** IANA zone for new inputs; empty means the browser's zone. */
  defaultZone: string;
  overflow: 'clamp' | 'roll';
};

export const DATE_DEFAULTS: DateSettings = {
  workweek: [false, true, true, true, true, true, false],
  defaultZone: '',
  overflow: 'clamp',
};

/** Workweek, default zone and month-end mode (spec §8.6); never holidays. */
export const dateSettings = createToolSettings(
  'date-calculator',
  DATE_DEFAULTS,
  {
    version: 1,
  },
);
