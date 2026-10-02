/** Query keys that only track clicks (spec §8.8); `*` is a suffix wildcard. */
export const DEFAULT_TRACKING = [
  'utm_*',
  'fbclid',
  'gclid',
  'dclid',
  'msclkid',
  'mc_eid',
  'igshid',
  'yclid',
  '_hsenc',
  '_hsmi',
  'ref_src',
];

/** A key matches `pattern` exactly, or by prefix when it ends in `*`. */
export function matchesPattern(key: string, pattern: string): boolean {
  const p = pattern.trim().toLowerCase();
  const k = key.toLowerCase();
  if (!p) return false;
  return p.endsWith('*') ? k.startsWith(p.slice(0, -1)) : k === p;
}

/**
 * The URL without query params matching `patterns`; the other params keep
 * their order and spelling. `removed` lists the dropped keys in order.
 */
export function cleanUrl(
  url: string,
  patterns: readonly string[],
): { url: string; removed: string[] } {
  const hashAt = url.indexOf('#');
  const beforeHash = hashAt < 0 ? url : url.slice(0, hashAt);
  const hash = hashAt < 0 ? '' : url.slice(hashAt);
  const q = beforeHash.indexOf('?');
  if (q < 0) return { url, removed: [] };
  const removed: string[] = [];
  const kept = beforeHash
    .slice(q + 1)
    .split('&')
    .filter((pair) => {
      if (!pair) return false;
      const raw = pair.split('=')[0];
      let key = raw;
      try {
        key = decodeURIComponent(raw.replace(/\+/g, ' '));
      } catch {
        // Keep the raw key for matching.
      }
      if (patterns.some((p) => matchesPattern(key, p))) {
        removed.push(key);
        return false;
      }
      return true;
    });
  const base = beforeHash.slice(0, q);
  return {
    url: base + (kept.length ? `?${kept.join('&')}` : '') + hash,
    removed,
  };
}
