import { createToolSettings } from '@/shared/lib/tool-settings';
import type { CronFlavour } from './lib/parse';

export type CronSettings = {
  flavour: CronFlavour;
  /** Zone for next runs; empty means the browser's zone. */
  zone: string;
  /** How many next runs to list: 10, 20 or 50. */
  count: number;
};

export const CRON_DEFAULTS: CronSettings = {
  flavour: 'unix',
  zone: '',
  count: 10,
};

/** Flavour, zone and run count (spec §9.7); never the expression. */
export const cronSettings = createToolSettings('cron-builder', CRON_DEFAULTS, {
  version: 1,
});
