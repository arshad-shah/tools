import { fromAbsolute, type ZonedDateTime } from '@internationalized/date';
import { toToolError } from '@/shared/lib/errors';
import { parseInstant } from '@/shared/lib/time';

/** A date field: the text as typed and the zone it is read in. */
export type DateValueInput = { text: string; zone: string };

/** Reads a date field into a zoned instant, or an error message. */
export function readDate(
  { text, zone }: DateValueInput,
  now: number,
): { value: ZonedDateTime; epochMs: number } | { error: string } | null {
  if (!text.trim()) return null;
  try {
    const { epochMs } = parseInstant(text, { zone, now });
    return { value: fromAbsolute(epochMs, zone), epochMs };
  } catch (e) {
    return { error: toToolError(e, 'Could not read that date').message };
  }
}
