import type { DocNode } from './doc-model';

export interface SearchResult {
  /** Matching node ids in document order. */
  ids: Set<string>;
  error?: string;
}

/**
 * Nodes whose key, name or value matches `term`: literal and
 * case-insensitive by default; with `regex`, an invalid pattern is reported
 * as "Invalid regex" and matches nothing (never throws).
 */
export function searchDoc(
  doc: DocNode | null,
  term: string,
  { regex = false }: { regex?: boolean } = {},
): SearchResult {
  const ids = new Set<string>();
  if (!doc || !term) return { ids };
  let test: (s: string) => boolean;
  if (regex) {
    let re: RegExp;
    try {
      re = new RegExp(term, 'iu');
    } catch {
      return { ids, error: 'Invalid regex' };
    }
    test = (s) => re.test(s);
  } else {
    const needle = term.toLowerCase();
    test = (s) => s.toLowerCase().includes(needle);
  }
  const stack: DocNode[] = [doc];
  while (stack.length) {
    const n = stack.pop()!;
    const key = n.name ?? (n.key === undefined ? undefined : String(n.key));
    if (
      (key !== undefined && test(key)) ||
      (n.value !== undefined && test(n.value))
    )
      ids.add(n.id);
    const kids = n.children;
    if (kids) for (let i = kids.length - 1; i >= 0; i--) stack.push(kids[i]);
  }
  return { ids };
}
