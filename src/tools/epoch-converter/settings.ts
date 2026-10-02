import { createToolSettings } from '@/shared/lib/tool-settings';

export type EpochSettings = {
  /** World clock and planner zones, in display order. */
  zones: string[];
  /** Working hours [start, end) for the planner. */
  workHours: number[];
};

export const EPOCH_DEFAULTS: EpochSettings = {
  zones: ['UTC', 'Europe/London', 'America/New_York', 'Asia/Tokyo'],
  workHours: [9, 17],
};

/** The zone list and working hours (spec §9.6). */
export const epochSettings = createToolSettings(
  'epoch-converter',
  EPOCH_DEFAULTS,
  {
    version: 1,
  },
);
