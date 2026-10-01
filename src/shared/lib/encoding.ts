import { ToolError } from './errors';

/**
 * Text and Base64 helpers that are safe for any Unicode text and any bytes.
 * `btoa`/`atob` alone only handle Latin-1 strings.
 */

export function utf8Encode(text: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(text);
}

/** Strict UTF-8 decode: invalid byte sequences are an error, not U+FFFD. */
export function utf8Decode(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch (cause) {
    throw new ToolError('INVALID_INPUT', 'The data is not valid UTF-8 text', {
      cause,
    });
  }
}

export interface Base64Options {
  /** RFC 4648 section 5 alphabet (`-` and `_`), without padding. */
  urlSafe?: boolean;
  /** Keep `=` padding. Defaults to true, or false when `urlSafe`. */
  padding?: boolean;
}

const CHUNK = 0x8000;

type NativeToBase64 = (opts?: {
  alphabet?: 'base64' | 'base64url';
  omitPadding?: boolean;
}) => string;

export function bytesToBase64(
  bytes: Uint8Array,
  { urlSafe = false, padding = !urlSafe }: Base64Options = {},
): string {
  // The native encoder (Uint8Array.prototype.toBase64) is much faster on
  // large files; fall back to btoa where it does not exist yet.
  const native = (Uint8Array.prototype as { toBase64?: NativeToBase64 })
    .toBase64;
  if (typeof native === 'function') {
    return native.call(bytes, {
      alphabet: urlSafe ? 'base64url' : 'base64',
      omitPadding: !padding,
    });
  }
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK)
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  let out = btoa(binary);
  if (urlSafe) out = out.replace(/\+/g, '-').replace(/\//g, '_');
  if (!padding) out = out.replace(/=+$/, '');
  return out;
}

/**
 * Decodes standard or URL-safe Base64. Whitespace and line breaks are
 * ignored and padding is optional.
 */
export function base64ToBytes(input: string): Uint8Array<ArrayBuffer> {
  const clean = input.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
  const body = clean.replace(/=+$/, '');
  if (
    /[^A-Za-z0-9+/]/.test(body) ||
    body.length % 4 === 1 ||
    clean.length - body.length > 2
  ) {
    throw new ToolError('INVALID_INPUT', 'The input is not valid Base64');
  }
  const padded = body + '='.repeat((4 - (body.length % 4)) % 4);
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/**
 * Strict Base64url as JWS uses it (RFC 7515 section 2): only `A-Z a-z 0-9
 * - _`, no padding, no whitespace.
 */
export function base64UrlToBytes(input: string): Uint8Array<ArrayBuffer> {
  if (/[^A-Za-z0-9_-]/.test(input) || input.length % 4 === 1) {
    throw new ToolError('INVALID_INPUT', 'The input is not valid Base64url');
  }
  return base64ToBytes(input);
}

export function toDataUri(bytes: Uint8Array, mime: string): string {
  return `data:${mime};base64,${bytesToBase64(bytes)}`;
}

/** `data:[mime][;base64],payload` → its bytes, or null if not a data URI. */
export function parseDataUri(
  input: string,
): { mime: string; bytes: Uint8Array } | null {
  const m = /^data:([^,]*?),(.*)$/s.exec(input.trim());
  if (!m) return null;
  const params = m[1].split(';');
  const isBase64 = params[params.length - 1].toLowerCase() === 'base64';
  if (isBase64) params.pop();
  const mime = params[0] || 'text/plain';
  if (isBase64) return { mime, bytes: base64ToBytes(m[2]) };
  return { mime, bytes: percentDecode(m[2]) };
}

/**
 * Percent-decodes straight to bytes, so `%FF` (not valid UTF-8 on its own)
 * is the byte 0xFF. Other characters are taken as UTF-8.
 */
function percentDecode(s: string): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < s.length; ) {
    if (s[i] === '%') {
      const hex = s.slice(i + 1, i + 3);
      if (!/^[0-9a-fA-F]{2}$/.test(hex))
        throw new ToolError(
          'INVALID_INPUT',
          `The data URI is malformed: bad escape at character ${i + 1}`,
        );
      out.push(parseInt(hex, 16));
      i += 3;
    } else {
      const cp = s.codePointAt(i) ?? 0;
      const ch = String.fromCodePoint(cp);
      for (const b of utf8Encode(ch)) out.push(b);
      i += ch.length;
    }
  }
  return new Uint8Array(out);
}
