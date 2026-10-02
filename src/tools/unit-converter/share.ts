import { getCategory } from './lib/units';

export const UNIT_SHARE_VERSION = 1;

export interface UnitShare {
  category: string;
  value: number;
  unit: string;
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** The shared-link validator (spec §4.2): category, value and unit. */
export function parseUnitShare(state: unknown): UnitShare | null {
  if (!isObject(state)) return null;
  const { category, value, unit } = state;
  if (typeof category !== 'string' || typeof unit !== 'string') return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const c = getCategory(category);
  if (!c?.units.some((u) => u.id === unit)) return null;
  return { category, value, unit };
}
