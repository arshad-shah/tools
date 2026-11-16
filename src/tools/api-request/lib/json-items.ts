import type { TreeItem } from '@arshad-shah/cynosure';

/** What a JSON value shows beside its key: its value, or its size. */
function summary(value: unknown): string {
  if (Array.isArray(value)) return `[${value.length}]`;
  if (value !== null && typeof value === 'object')
    return `{${Object.keys(value).length}}`;
  if (typeof value === 'string') return JSON.stringify(value);
  return String(value);
}

const isBranch = (v: unknown) => v !== null && typeof v === 'object';

/**
 * A JSON value as Cynosure Tree items. Only expanded branches build their
 * children, so a large response stays cheap until it is opened.
 */
export function jsonItems(
  label: string,
  value: unknown,
  id: string,
  expanded: ReadonlySet<string>,
): TreeItem<string> {
  const item: TreeItem<string> = { id, label, data: summary(value) };
  if (!isBranch(value)) return item;
  const entries: [string, unknown][] = Array.isArray(value)
    ? value.map((v, i) => [String(i), v])
    : Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) return item;
  item.hasChildren = true;
  if (expanded.has(id))
    item.children = entries.map(([k, v]) =>
      jsonItems(
        k,
        v,
        Array.isArray(value) ? `${id}[${k}]` : `${id}.${JSON.stringify(k)}`,
        expanded,
      ),
    );
  return item;
}
