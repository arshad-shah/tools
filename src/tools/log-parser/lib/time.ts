import { parseInstant } from '@/shared/lib/time/parse';

const MONTHS = 'jan feb mar apr may jun jul aug sep oct nov dec'.split(' ');
const ISO =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:[.,](\d{1,9}))?)?\s*(Z|[+-]\d{2}:?\d{2})?$/i;
const APACHE =
  /^(\d{2})\/([A-Za-z]{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2})\s*([+-]\d{4})?$/;

const offsetMs = (z: string | undefined): number => {
  if (!z || z.toUpperCase() === 'Z') return 0;
  const m = /^([+-])(\d{2}):?(\d{2})$/.exec(z)!;
  const mins = Number(m[2]) * 60 + Number(m[3]);
  return (m[1] === '-' ? -1 : 1) * mins * 60_000;
};

/**
 * Epoch milliseconds for a log timestamp: ISO 8601 (space or T, comma or
 * dot fractions, UTC when no offset is given), Apache `10/Oct/2000:13:55:36
 * -0700`, Unix s/ms/us/ns numbers. Undefined when it cannot be read.
 */
export function toEpoch(
  value: string | number | undefined,
): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'number')
    return Number.isFinite(value)
      ? value < 1e11
        ? value * 1000
        : value < 1e14
          ? value
          : value < 1e17
            ? value / 1000
            : value / 1e6
      : undefined;
  const t = value.trim();
  let m = ISO.exec(t);
  if (m) {
    const ms = Number((m[7] ?? '0').padEnd(3, '0').slice(0, 3));
    return (
      Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] ?? 0), ms) -
      offsetMs(m[8])
    );
  }
  m = APACHE.exec(t);
  if (m) {
    const month = MONTHS.indexOf(m[2].toLowerCase());
    if (month < 0) return undefined;
    return Date.UTC(+m[3], month, +m[1], +m[4], +m[5], +m[6]) - offsetMs(m[7]);
  }
  try {
    return parseInstant(t, { zone: 'UTC', now: 0 }).epochMs;
  } catch {
    return undefined;
  }
}

/** A leading ISO-like timestamp of a line, if any. */
export const LEADING_TS =
  /^\[?(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:[.,]\d{1,9})?)?\s*(?:Z|[+-]\d{2}:?\d{2})?)\]?/i;
