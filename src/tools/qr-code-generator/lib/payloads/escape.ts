/** WiFi and MeCard records escape `\ ; , : "` with a backslash. */
export const escapeRecord = (s: string) => s.replace(/([\\;,:"])/g, '\\$1');

/** vCard 3.0 text values escape `\ , ;` and newlines. */
export const escapeVcard = (s: string) =>
  s
    .replace(/\\/g, '\\\\')
    .replace(/([,;])/g, '\\$1')
    .replace(/\r?\n/g, '\\n');

/** Query string with %20 for spaces (BIP-21, mailto), empty values left out. */
export function query(pairs: [string, string][]): string {
  const q = pairs
    .filter(([, v]) => v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
  return q ? `?${q}` : '';
}
