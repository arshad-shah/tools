import type { DateOp, OpUnit } from './arith';

export const OP_UNITS: { value: OpUnit; label: string }[] = [
  { value: 'minute', label: 'Minutes' },
  { value: 'hour', label: 'Hours' },
  { value: 'day', label: 'Days' },
  { value: 'week', label: 'Weeks' },
  { value: 'month', label: 'Months' },
  { value: 'year', label: 'Years' },
  { value: 'business-day', label: 'Business days' },
];

const UNITS = new Set<string>(OP_UNITS.map((u) => u.value));

/** "1 month; -3 day" (the share-link form of a chain). */
export const serializeOps = (ops: DateOp[]): string =>
  ops.map((o) => `${o.amount} ${o.unit}`).join('; ');

/** The chain back from its text; malformed steps are dropped. */
export function parseOps(text: string): DateOp[] {
  return text
    .split(';')
    .map((s) => /^\s*(-?\d{1,6})\s+([a-z-]+)\s*$/.exec(s))
    .filter((m): m is RegExpExecArray => m !== null && UNITS.has(m[2]))
    .map((m) => ({ amount: Number(m[1]), unit: m[2] as OpUnit }));
}
