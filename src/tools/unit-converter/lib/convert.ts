import type { Unit } from './units';

/** `value` in unit `from` expressed in unit `to` (same category). */
export const convert = (value: number, from: Unit, to: Unit): number =>
  to.fromBase(from.toBase(value));
