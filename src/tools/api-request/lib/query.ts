/** Appends params; a URL that does not parse is left for fetch to reject. */
export function withParams(url: string, params: [string, string][]): string {
  if (params.length === 0) return url;
  try {
    const u = new URL(url);
    for (const [k, v] of params) u.searchParams.append(k, v);
    return u.toString();
  } catch {
    const q = new URLSearchParams(params).toString();
    return url + (url.includes('?') ? '&' : '?') + q;
  }
}
