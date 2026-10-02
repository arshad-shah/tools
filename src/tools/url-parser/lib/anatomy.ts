import { encodeFragment, encodePath, buildQuery } from './build';
import type { UrlModel } from './model';

export type PartId =
  | 'protocol'
  | 'userinfo'
  | 'host'
  | 'port'
  | 'path'
  | 'query'
  | 'fragment';

export interface Segment {
  id: PartId;
  label: string;
  /** As written in the URL (encoded). */
  text: string;
}

/** The URL's parts in order, as they appear in the built URL. */
export function anatomy(m: UrlModel): Segment[] {
  const out: Segment[] = [
    { id: 'protocol', label: 'Protocol', text: m.protocol },
  ];
  if (m.username || m.password)
    out.push({
      id: 'userinfo',
      label: 'User info',
      text: `${encodeURIComponent(m.username)}${m.password ? ':' + encodeURIComponent(m.password) : ''}`,
    });
  if (m.hostnamePunycode)
    out.push({ id: 'host', label: 'Host', text: m.hostnamePunycode });
  if (m.port) out.push({ id: 'port', label: 'Port', text: m.port });
  if (m.pathname)
    out.push({ id: 'path', label: 'Path', text: encodePath(m.pathname) });
  const q = buildQuery(m.params);
  if (q) out.push({ id: 'query', label: 'Query', text: q });
  if (m.hash)
    out.push({
      id: 'fragment',
      label: 'Fragment',
      text: encodeFragment(m.hash),
    });
  return out;
}

/** Keeps row ids stable by position so editors keep focus while typing. */
export function reuseIds<T extends { id: string }>(
  prev: readonly T[],
  next: T[],
): T[] {
  return next.map((r, i) => (prev[i] ? { ...r, id: prev[i].id } : r));
}
