import { formatBytes } from '@/shared/lib/format';
import type { JobProgress } from '@/shared/state/useJob';

/** "Parsing 340.0 MB of 1.2 GB" for a file, "Parsing" otherwise. */
export function progressText(p: JobProgress | null, bytes: boolean): string {
  if (!p || !bytes || p.total <= 0) return 'Parsing';
  return `Parsing ${formatBytes(p.done)} of ${formatBytes(p.total)}`;
}

/** "1,234 entries" with the right plural. */
export const entryCount = (n: number): string =>
  `${n.toLocaleString('en-US')} ${n === 1 ? 'entry' : 'entries'}`;

/** A compact UTC time for a row: 2024-01-15 08:23:45.123. */
export const rowTime = (ts: number | undefined): string =>
  ts === undefined
    ? ''
    : new Date(ts).toISOString().slice(0, 23).replace('T', ' ');
