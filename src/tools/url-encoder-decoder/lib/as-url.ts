/**
 * The output as an absolute http(s) URL when it is exactly one, for "Open
 * in URL Inspector" (text/uri-list); null otherwise.
 */
export function asUrl(text: string): string | null {
  const t = text.trim();
  if (!/^https?:\/\/\S+$/i.test(t)) return null;
  try {
    return new URL(t).href;
  } catch {
    return null;
  }
}
