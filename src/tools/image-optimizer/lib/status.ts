import { notSmaller, type BatchRow } from './batch';

export const dims = (d?: { width?: number; height?: number }) =>
  d?.width && d.height ? `${d.width} x ${d.height}` : '';

export const formatSaving = (p: number | null) =>
  p === null
    ? ''
    : p >= 0
      ? `${p.toFixed(1)}%`
      : `${Math.abs(p).toFixed(1)}% larger`;

export function statusText(r: BatchRow): string {
  switch (r.status) {
    case 'queued':
      return 'Waiting';
    case 'running':
      return 'Compressing';
    case 'cancelled':
      return 'Cancelled';
    case 'error':
      return `Failed: ${r.error ?? 'unknown error'}`;
    case 'done': {
      const base = r.keepOriginal
        ? 'Kept original'
        : notSmaller(r)
          ? 'Not smaller'
          : 'Done';
      return r.note ? `${base}. ${r.note}` : base;
    }
  }
}
