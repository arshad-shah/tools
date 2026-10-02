import type { TreeNodeData } from '@/shared/ui';

const leaf = (v: unknown): TreeNodeData['value'] => {
  if (v === null) return { text: 'null', kind: 'null' };
  if (typeof v === 'string') return { text: JSON.stringify(v), kind: 'string' };
  if (typeof v === 'number') return { text: String(v), kind: 'number' };
  if (typeof v === 'boolean') return { text: String(v), kind: 'boolean' };
  return { text: String(v), kind: 'string' };
};

/** One JSON value as a lazy CodeTree node (children built on expand). */
export function jsonNode(
  label: string,
  value: unknown,
  id: string,
): TreeNodeData {
  if (Array.isArray(value))
    return {
      id,
      label,
      summary: `[${value.length}]`,
      childCount: value.length,
      children: () =>
        value.map((v, i) => jsonNode(String(i), v, `${id}[${i}]`)),
    };
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value);
    return {
      id,
      label,
      summary: `{${entries.length}}`,
      childCount: entries.length,
      children: () =>
        entries.map(([k, v]) => jsonNode(k, v, `${id}.${JSON.stringify(k)}`)),
    };
  }
  return { id, label, value: leaf(value), childCount: 0 };
}
