/**
 * Default import of a CommonJS package that only sets `exports.default`
 * (e.g. react-plotly.js). Depending on the bundler's interop the import is
 * either the export itself or the whole module object; this returns the
 * export in both cases.
 */
export function unwrapDefault<T>(imported: T): T {
  if (
    imported !== null &&
    typeof imported === 'object' &&
    'default' in imported &&
    imported.default !== undefined
  ) {
    return imported.default as T;
  }
  return imported;
}
