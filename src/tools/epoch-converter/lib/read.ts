import { ToolError } from '@/shared/lib/errors';
import { parseInstant, type InstantKind } from '@/shared/lib/time';

/** How to read a bare number: by magnitude, or as a chosen Unix unit. */
export type ReadAs = 'auto' | 'unix-s' | 'unix-ms' | 'unix-us' | 'unix-ns';

const DIVISORS: Record<Exclude<ReadAs, 'auto'>, number> = {
  'unix-s': 1e-3,
  'unix-ms': 1,
  'unix-us': 1e3,
  'unix-ns': 1e6,
};

/**
 * The instant typed in the converter (spec §9.6): `auto` detects Unix
 * seconds to nanoseconds by digit count, ISO 8601, RFC 2822, "now" and
 * relative text; an override reads a plain number in that unit.
 */
export function readInstant(
  text: string,
  readAs: ReadAs,
  { zone, now }: { zone: string; now: number },
): { epochMs: number; detected: InstantKind } {
  const t = text.trim();
  if (readAs !== 'auto' && /^[+-]?\d+(\.\d+)?$/.test(t)) {
    const ms = Number(t) / DIVISORS[readAs];
    if (!Number.isFinite(ms) || Math.abs(ms) > 8.64e15)
      throw new ToolError('INVALID_INPUT', 'That timestamp is out of range');
    return { epochMs: Math.round(ms), detected: readAs };
  }
  return parseInstant(t, { zone, now });
}
