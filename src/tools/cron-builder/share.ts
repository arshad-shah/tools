import type { CronFlavour } from './lib/parse';

export const CRON_SHARE_VERSION = 1;

export interface CronShare {
  expr: string;
  flavour: CronFlavour;
  zone: string;
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** The shared-link validator (spec §4.2): expression, flavour and zone. */
export function parseCronShare(state: unknown): CronShare | null {
  if (!isObject(state)) return null;
  const { expr, flavour, zone } = state;
  if (typeof expr !== 'string' || expr.length > 500) return null;
  if (flavour !== 'unix' && flavour !== 'seconds' && flavour !== 'quartz')
    return null;
  if (typeof zone !== 'string' || zone.length > 64) return null;
  return { expr, flavour, zone };
}
