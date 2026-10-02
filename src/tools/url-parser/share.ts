export const URL_SHARE_VERSION = 1;

export interface UrlShareState {
  v: 1;
  url: string;
}

/** Query keys that look like secrets (spec §4.2 safeguard). */
const SECRET_KEY =
  /(^|[_-])(token|key|sig|signature|password|passwd|pwd|secret|auth|code|session|apikey)([_-]|$)/i;

export function looksSecretKey(key: string): boolean {
  return (
    SECRET_KEY.test(key) ||
    /^(access|api|client)_?(token|key|secret)$/i.test(key)
  );
}

/** Secret-looking query keys in `url`, unique, in order. */
export function secretQueryKeys(url: string): string[] {
  try {
    const keys = [...new URL(url).searchParams.keys()];
    return [...new Set(keys.filter(looksSecretKey))];
  } catch {
    return [];
  }
}

/** The URL as shared: the userinfo password is stripped. */
export function shareableUrl(url: string): string {
  try {
    const u = new URL(url);
    if (!u.password) return url;
    u.password = '';
    return u.href;
  } catch {
    return url;
  }
}

export function toUrlShare(url: string): UrlShareState {
  return { v: 1, url: shareableUrl(url) };
}

/** Validates a shared URL Inspector link. */
export function parseUrlShare(state: unknown): UrlShareState | null {
  if (typeof state !== 'object' || state === null) return null;
  const s = state as Record<string, unknown>;
  if (s.v !== 1 || typeof s.url !== 'string' || s.url.length > 8192)
    return null;
  return { v: 1, url: shareableUrl(s.url) };
}
