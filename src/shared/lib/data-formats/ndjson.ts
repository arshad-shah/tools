/** Newline-delimited JSON: one compact value per line. */
export function toNdjson(rows: readonly unknown[]): string {
  return (
    rows.map((r) => JSON.stringify(r) ?? 'null').join('\n') +
    (rows.length ? '\n' : '')
  );
}
