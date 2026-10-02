import { angle } from './angle';
import { area } from './area';
import { cooking } from './cooking';
import { data } from './data';
import { dataRate } from './data-rate';
import type { Category, Unit } from './define';
import { density } from './density';
import { energy } from './energy';
import { force } from './force';
import { frequency } from './frequency';
import { fuel } from './fuel';
import { length } from './length';
import { mass } from './mass';
import { power } from './power';
import { pressure } from './pressure';
import { speed } from './speed';
import { temperature } from './temperature';
import { time } from './time';
import { torque } from './torque';
import { typography } from './typography';
import { volume } from './volume';

export type { Category, Unit } from './define';
export { typography } from './typography';

/** Every category, in display order (typography at a 16 px base). */
export const CATEGORIES: Category[] = [
  length,
  mass,
  volume,
  temperature,
  area,
  speed,
  time,
  data,
  dataRate,
  pressure,
  energy,
  power,
  force,
  torque,
  angle,
  frequency,
  fuel,
  density,
  typography(16),
  cooking,
];

/** A category by id; typography is built for `basePx`. */
export function getCategory(
  id: string,
  { basePx = 16 } = {},
): Category | undefined {
  if (id === 'typography') return typography(basePx);
  return CATEGORIES.find((c) => c.id === id);
}

export const findUnit = (category: Category, id: string): Unit | undefined =>
  category.units.find((u) => u.id === id);
