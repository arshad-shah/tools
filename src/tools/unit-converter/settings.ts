import { createToolSettings } from '@/shared/lib/tool-settings';

/** A settled conversion; `amount` is in `from`. */
export type UnitHistoryEntry = {
  category: string;
  from: string;
  to: string;
  amount: number;
  at: number;
};

export type UnitSettings = {
  category: string;
  /** Pinned units as `category:unit`, shown first. */
  favourites: string[];
  /**
   * The last 20 settled conversions. Spec §8.5 lists unit history as a
   * persisted feature (users keep their recent conversions), so it is
   * allowed here by name; it holds amounts and unit ids only.
   */
  history: UnitHistoryEntry[];
  /** Significant digits shown. */
  precision: number;
  /** Decimal mark for typing and display: the locale's, or forced. */
  locale: 'auto' | 'dot' | 'comma';
  /** Base font size for rem and em. */
  basePx: number;
};

export const HISTORY_LIMIT = 20;

export const UNIT_DEFAULTS: UnitSettings = {
  category: 'length',
  favourites: [],
  history: [],
  precision: 10,
  locale: 'auto',
  basePx: 16,
};

/** Keeps the newest conversion first, without repeats, capped at 20. */
export function addHistory(
  history: UnitHistoryEntry[],
  entry: UnitHistoryEntry,
): UnitHistoryEntry[] {
  const same = (h: UnitHistoryEntry) =>
    h.category === entry.category &&
    h.from === entry.from &&
    h.to === entry.to &&
    h.amount === entry.amount;
  return [entry, ...history.filter((h) => !same(h))].slice(0, HISTORY_LIMIT);
}

export const unitSettings = createToolSettings(
  'unit-converter',
  UNIT_DEFAULTS,
  {
    version: 1,
  },
);
