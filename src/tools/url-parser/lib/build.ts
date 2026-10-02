import { toAsciiHost } from '@/shared/lib/punycode';
import type { KeyValueRow, UrlModel } from './model';

/** RFC 3986 pchar: unreserved, sub-delims, ':' and '@' stay as they are. */
const keep = (extra: string) =>
  new RegExp(`[^A-Za-z0-9\\-._~!$&'()*+,;=:@${extra}]`, 'gu');

const encodeWith = (re: RegExp) => (s: string) =>
  s.replace(re, (c) => encodeURIComponent(c));

/** A decoded path, each segment encoded (`/a b` is `/a%20b`). */
export const encodePath = (p: string) =>
  p
    .split('/')
    .map(encodeWith(keep('')))
    .join('/');

export const encodeFragment = encodeWith(keep('/?'));

/** Query parts: `&`, `=`, `+` and `#` are escaped so they stay data. */
const encodeQueryPart = (s: string) =>
  encodeWith(keep('/?'))(s).replace(/[&=+#]/g, (c) => encodeURIComponent(c));

/** Enabled rows with a key (or value) in order: `a=1&a=2`. */
export function buildQuery(params: KeyValueRow[]): string {
  return params
    .filter((p) => p.enabled && (p.key !== '' || p.value !== ''))
    .map((p) => `${encodeQueryPart(p.key)}=${encodeQueryPart(p.value)}`)
    .join('&');
}

/** The model back to a URL string, each part encoded for its position. */
export function buildUrl(m: UrlModel): string {
  const userinfo =
    m.username || m.password
      ? `${encodeURIComponent(m.username)}${m.password ? `:${encodeURIComponent(m.password)}` : ''}@`
      : '';
  const host = m.hostname ? toAsciiHost(m.hostname) : '';
  const port = m.port ? `:${m.port}` : '';
  const special = /^(https?|wss?|ftp|file):$/.test(m.protocol);
  const authority = special || host ? `//${userinfo}${host}${port}` : '';
  let path = encodePath(m.pathname);
  if (authority && path && !path.startsWith('/')) path = `/${path}`;
  const query = buildQuery(m.params);
  const out =
    `${m.protocol}${authority}${path}` +
    (query ? `?${query}` : '') +
    (m.hash ? `#${encodeFragment(m.hash)}` : '');
  // Normalise through the URL parser when it accepts the result.
  try {
    return new URL(out).href;
  } catch {
    return out;
  }
}
