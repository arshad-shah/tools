import { ToolError } from '@/shared/lib/errors';
import { newId } from '@/shared/lib/id';
import { toUnicodeHost } from '@/shared/lib/punycode';

/** Matches the kit KeyValueRow (6-A2) so ParamsEditor binds directly. */
export interface KeyValueRow {
  id: string;
  enabled: boolean;
  key: string;
  value: string;
  description?: string;
}

/** A URL as editable, decoded parts (spec §8.8 URL Inspector). */
export interface UrlModel {
  /** With the colon, e.g. `https:`. */
  protocol: string;
  username: string;
  password: string;
  /** ASCII (punycode) form, as sent on the wire. */
  hostname: string;
  /** '' when the scheme's default port is used. */
  port: string;
  /** Decoded, e.g. `/a b`. */
  pathname: string;
  /** In order, duplicates kept. */
  params: KeyValueRow[];
  /** Decoded, without `#`. */
  hash: string;
  origin: string;
  /** True when no port is given or it is the scheme's default. */
  defaultPort: boolean;
  hostnameUnicode: string;
  hostnamePunycode: string;
  /** The input was relative and resolved against the base URL. */
  isRelative: boolean;
}

/** Decodes percent-escapes, keeping the text when it is malformed. */
export function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** `a=1&a=2&b` in order; `+` is a space as in forms. */
export function parseQuery(search: string): KeyValueRow[] {
  const q = search.startsWith('?') ? search.slice(1) : search;
  if (!q) return [];
  return q
    .split('&')
    .filter((p) => p !== '')
    .map((pair) => {
      const at = pair.indexOf('=');
      const raw = (s: string) => safeDecode(s.replace(/\+/g, ' '));
      return {
        id: newId(),
        enabled: true,
        key: raw(at < 0 ? pair : pair.slice(0, at)),
        value: at < 0 ? '' : raw(pair.slice(at + 1)),
      };
    });
}

const notValid = (cause?: unknown) =>
  new ToolError(
    'INVALID_INPUT',
    'Not a valid URL; add a base URL for relative paths',
    { cause },
  );

/** Splits `input` (resolved against `base` when relative) into its parts. */
export function parseUrlModel(input: string, base?: string): UrlModel {
  const text = input.trim();
  if (!text) throw notValid();
  let u: URL;
  let isRelative = false;
  try {
    u = new URL(text);
  } catch (first) {
    if (!base?.trim()) throw notValid(first);
    try {
      u = new URL(text, base.trim());
      isRelative = true;
    } catch (cause) {
      throw notValid(cause);
    }
  }
  return {
    protocol: u.protocol,
    username: safeDecode(u.username),
    password: safeDecode(u.password),
    hostname: u.hostname,
    port: u.port,
    pathname: safeDecode(u.pathname),
    params: parseQuery(u.search),
    hash: safeDecode(u.hash.replace(/^#/, '')),
    origin: u.origin,
    defaultPort: u.port === '',
    hostnameUnicode: toUnicodeHost(u.hostname),
    hostnamePunycode: u.hostname,
    isRelative,
  };
}

/** The scheme's default port, for the "default port" note. */
export const DEFAULT_PORTS: Record<string, string> = {
  'http:': '80',
  'https:': '443',
  'ws:': '80',
  'wss:': '443',
  'ftp:': '21',
};
