/** A unit: conversions to and from its category's base unit. */
export interface Unit {
  id: string;
  label: string;
  symbol: string;
  toBase(v: number): number;
  fromBase(v: number): number;
  /** Shown beside the unit, e.g. how an average is defined. */
  note?: string;
}

export interface Category {
  id: string;
  label: string;
  /** The id of the unit every other unit converts through. */
  base: string;
  units: Unit[];
}

/** A unit that is `factor` base units (exact factors cited per category). */
export function linear(
  id: string,
  label: string,
  symbol: string,
  factor: number,
  note?: string,
): Unit {
  return {
    id,
    label,
    symbol,
    toBase: (v) => v * factor,
    fromBase: (v) => v / factor,
    ...(note ? { note } : {}),
  };
}
