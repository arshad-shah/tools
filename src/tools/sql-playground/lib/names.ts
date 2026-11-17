/** SQLite identifiers: quoting and names for imported tables and columns. */

/** `"a""b"`: an identifier quoted for SQLite. */
export function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/**
 * A readable table name from a file name: the extension dropped, runs of
 * anything but letters, digits and underscores turned into one underscore,
 * and a leading digit prefixed (so the name needs no quotes when typed).
 */
export function tableNameFromFile(fileName: string): string {
  const base = fileName.replace(/\.[^./\\]+$/, '');
  let name = base
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
  if (!name) name = 'data';
  if (/^\d/.test(name)) name = `t_${name}`;
  if (/^sqlite_/.test(name)) name = `t_${name}`;
  return name.slice(0, 64);
}

/**
 * `name`, or `name_2`, `name_3`... when taken. SQLite compares identifiers
 * without regard to ASCII case, so `taken` is matched that way too.
 */
export function uniqueName(name: string, taken: Iterable<string>): string {
  const used = new Set([...taken].map((t) => t.toLowerCase()));
  if (!used.has(name.toLowerCase())) return name;
  let n = 2;
  while (used.has(`${name}_${n}`.toLowerCase())) n++;
  return `${name}_${n}`;
}

/**
 * Column names from a header row: blanks become `column_N` (1-based) and
 * repeats get `_2`, `_3`, case-insensitively, as SQLite requires.
 */
export function columnNames(header: readonly unknown[]): string[] {
  const out: string[] = [];
  header.forEach((h, i) => {
    const raw = h === null || h === undefined ? '' : String(h).trim();
    out.push(uniqueName(raw || `column_${i + 1}`, out));
  });
  return out;
}
