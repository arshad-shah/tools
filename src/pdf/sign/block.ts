import type { SignatureContent } from '@/pdf/doc/ops/sign-params';
import type { Box } from '@/pdf/doc/types';

/** A signature block: the signature over printed name, title and date. */
export interface BlockContent {
  signature: SignatureContent;
  name: string;
  /** '' leaves the title line out. */
  title: string;
  /** Calendar date, YYYY-MM-DD. */
  dateIso: string;
  /** BCP 47 locale the date is written in. */
  locale: string;
  showDate: boolean;
}

/** The long date style of `locale` ("1 October 2026"), for that calendar day. */
export function formatBlockDate(iso: string, locale: string): string {
  // Midday UTC, formatted in UTC: the calendar day never shifts.
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${iso}T12:00:00Z`));
}

/** Page-space boxes (y up) of a block's parts; absent lines are null. */
export interface BlockLayout {
  signature: Box;
  name: Box;
  title: Box | null;
  date: Box | null;
}

/** Share of the block's height the signature takes. */
const SIGNATURE_SHARE = 0.55;
const LINES = 3;

/**
 * Stacks the parts inside `rect`: the signature in the top 55%, then up to
 * three equal text lines (name, title, date), present lines from the top.
 */
export function layoutBlock(rect: Box, c: BlockContent): BlockLayout {
  const sigH = rect.height * SIGNATURE_SHARE;
  const lineH = (rect.height - sigH) / LINES;
  const top = rect.y + rect.height;
  let slot = 0;
  const line = (present: boolean): Box | null => {
    if (!present) return null;
    slot += 1;
    return {
      x: rect.x,
      y: top - sigH - slot * lineH,
      width: rect.width,
      height: lineH,
    };
  };
  return {
    signature: { x: rect.x, y: top - sigH, width: rect.width, height: sigH },
    name: line(true)!,
    title: line(c.title.trim() !== ''),
    date: line(c.showDate),
  };
}
