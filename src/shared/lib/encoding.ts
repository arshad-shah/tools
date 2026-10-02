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

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** RFC 4648 Base32 (upper case; `=` padding unless `padding: false`). */
export function bytesToBase32(
  bytes: Uint8Array,
  { padding = true }: { padding?: boolean } = {},
): string {
  let out = '';
  let buffer = 0;
  let bits = 0;
  for (const b of bytes) {
    buffer = (buffer << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(buffer >>> (bits - 5)) & 31];
      bits -= 5;
    }
    buffer &= (1 << bits) - 1;
  }
  if (bits > 0) out += BASE32[(buffer << (5 - bits)) & 31];
  if (padding) out += '='.repeat((8 - (out.length % 8)) % 8);
  return out;
}

/**
 * Decodes RFC 4648 Base32 in any case, with or without padding; spaces and
 * line breaks are ignored. Errors name the character position (1-based).
 */
export function base32ToBytes(input: string): Uint8Array<ArrayBuffer> {
  const body = input.replace(/=+\s*$/, '');
  const out: number[] = [];
  let buffer = 0;
  let bits = 0;
  let count = 0;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (/\s/.test(ch)) continue;
    const v = BASE32.indexOf(ch.toUpperCase());
    if (v < 0)
      throw new ToolError(
        'INVALID_INPUT',
        `Not valid Base32: unexpected "${ch}" at character ${i + 1}`,
      );
    buffer = ((buffer << 5) | v) & 0xffff;
    bits += 5;
    count++;
    if (bits >= 8) {
      out.push((buffer >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  // 1, 3 and 6 characters in a final group cannot come from whole bytes.
  if ([1, 3, 6].includes(count % 8))
    throw new ToolError(
      'INVALID_INPUT',
      'Not valid Base32: the length is not possible for encoded bytes',
    );
  return new Uint8Array(out);
}

const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/** Base58 with the Bitcoin alphabet; each leading zero byte becomes "1". */
export function bytesToBase58(bytes: Uint8Array): string {
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++;
  // Repeated long division of the big-endian number by 58.
  const digits: number[] = [];
  const num = Array.from(bytes.subarray(zeros));
  let start = 0;
  while (start < num.length) {
    let rem = 0;
    for (let i = start; i < num.length; i++) {
      const acc = rem * 256 + num[i];
      num[i] = Math.floor(acc / 58);
      rem = acc % 58;
    }
    digits.push(rem);
    while (start < num.length && num[start] === 0) start++;
  }
  return (
    '1'.repeat(zeros) +
    digits
      .reverse()
      .map((d) => BASE58[d])
      .join('')
  );
}

/** Decodes Bitcoin-alphabet Base58; errors name the character position. */
export function base58ToBytes(input: string): Uint8Array<ArrayBuffer> {
  const text = input.trim();
  let zeros = 0;
  while (zeros < text.length && text[zeros] === '1') zeros++;
  // Little-endian base-256 digits, multiplied by 58 per character.
  const bytes: number[] = [];
  for (let i = zeros; i < text.length; i++) {
    const v = BASE58.indexOf(text[i]);
    if (v < 0)
      throw new ToolError(
        'INVALID_INPUT',
        `Not valid Base58: unexpected "${text[i]}" at character ${i + 1}`,
      );
    let carry = v;
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  const out = new Uint8Array(zeros + bytes.length);
  bytes.reverse().forEach((b, i) => (out[zeros + i] = b));
  return out;
}

/** Bits as 0 and 1, `groupBy` bits per space-separated group. */
export function bytesToBinary(bytes: Uint8Array, groupBy = 8): string {
  if (!Number.isInteger(groupBy) || groupBy < 1)
    throw new RangeError(
      `groupBy must be a whole number of bits, got ${groupBy}`,
    );
  let bits = '';
  for (const b of bytes) bits += b.toString(2).padStart(8, '0');
  const groups: string[] = [];
  for (let i = 0; i < bits.length; i += groupBy)
    groups.push(bits.slice(i, i + groupBy));
  return groups.join(' ');
}
