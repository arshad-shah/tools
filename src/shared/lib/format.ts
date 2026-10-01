const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

export function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit++;
  }
  // 1023.99 KB would print as "1024.0 KB": roll over once rounding hits 1024.
  if (Number(value.toFixed(decimals)) >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(decimals)} ${UNITS[unit]}`;
}

/** Relative size change, e.g. `−42.3%`. Uses a true minus sign. */
export function formatSizeChange(before: number, after: number): string {
  if (!(before > 0)) return '—';
  const pct = ((after - before) / before) * 100;
  const sign = pct > 0 ? '+' : pct < 0 ? '−' : '±';
  return `${sign}${Math.abs(pct).toFixed(1)}%`;
}
