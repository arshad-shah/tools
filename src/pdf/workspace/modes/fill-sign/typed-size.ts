/** Size slider of the typed signature: 0 is Auto, then 8..48pt. */
export const SIZE_MIN = 8;
export const SIZE_MAX = 48;

/** 1..7 are not sizes: stepping down from 8 goes to Auto, up from Auto to 8. */
export function nextSize(prev: number, v: number): number {
  if (v === 0 || v >= SIZE_MIN) return v;
  return v > prev ? SIZE_MIN : 0;
}
