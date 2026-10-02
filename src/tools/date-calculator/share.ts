export const DATE_SHARE_VERSION = 1;

export type DateTab = 'difference' | 'arithmetic' | 'business';

export interface DateShare {
  tab: DateTab;
  /** Input texts by name (start, end, base, ops). */
  inputs: Record<string, string>;
  zone: string;
  workweek: boolean[];
  holidays: string[];
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const TABS: DateTab[] = ['difference', 'arithmetic', 'business'];

/** The shared-link validator (spec §4.2): mode, inputs, zone, workweek, holidays. */
export function parseDateShare(state: unknown): DateShare | null {
  if (!isObject(state)) return null;
  const { tab, inputs, zone, workweek, holidays } = state;
  if (!TABS.includes(tab as DateTab)) return null;
  if (!isObject(inputs)) return null;
  const entries = Object.entries(inputs);
  if (
    entries.length > 20 ||
    !entries.every(([, v]) => typeof v === 'string' && v.length <= 2000)
  )
    return null;
  if (typeof zone !== 'string' || zone.length > 64) return null;
  if (
    !Array.isArray(workweek) ||
    workweek.length !== 7 ||
    !workweek.every((d) => typeof d === 'boolean')
  )
    return null;
  if (
    !Array.isArray(holidays) ||
    holidays.length > 1000 ||
    !holidays.every(
      (h) => typeof h === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(h),
    )
  )
    return null;
  return {
    tab: tab as DateTab,
    inputs: inputs as Record<string, string>,
    zone,
    workweek: workweek as boolean[],
    holidays: holidays as string[],
  };
}
