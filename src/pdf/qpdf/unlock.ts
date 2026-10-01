import { ToolError } from '@/shared/lib/errors';

/** What the encrypted-input flow needs from qpdf (the `qpdf` client fits). */
export interface UnlockEngine {
  inspect(
    bytes: Uint8Array,
    password?: string,
    signal?: AbortSignal,
  ): Promise<{ encrypted: boolean; needsPassword: boolean }>;
  decrypt(
    bytes: Uint8Array,
    password: string,
    signal?: AbortSignal,
  ): Promise<{ bytes: Uint8Array }>;
}

export type PreparedPdf =
  | { status: 'ready'; bytes: Uint8Array; wasEncrypted: boolean }
  | { status: 'locked' };

const WANTED = 'Encrypt';
// PDF whitespace and delimiters end a name; everything else belongs to it.
const ENDS_NAME = new Set([
  0x00, 0x09, 0x0a, 0x0c, 0x0d, 0x20, 0x28, 0x29, 0x3c, 0x3e, 0x5b, 0x5d, 0x7b,
  0x7d, 0x2f, 0x25,
]);
const hex = (c: number) =>
  c >= 0x30 && c <= 0x39
    ? c - 0x30
    : c >= 0x41 && c <= 0x46
      ? c - 0x37
      : c >= 0x61 && c <= 0x66
        ? c - 0x57
        : -1;

/** Whether the name starting after the '/' at `i` is /Encrypt (#xx decoded). */
function isEncryptName(bytes: Uint8Array, i: number): boolean {
  let name = '';
  let j = i + 1;
  while (j < bytes.length && !ENDS_NAME.has(bytes[j])) {
    if (name.length >= WANTED.length) return false;
    let c = bytes[j];
    if (c === 0x23) {
      const hi = hex(bytes[j + 1] ?? -1);
      const lo = hex(bytes[j + 2] ?? -1);
      if (hi < 0 || lo < 0) return false;
      c = hi * 16 + lo;
      j += 3;
    } else j++;
    if (c !== WANTED.charCodeAt(name.length)) return false;
    name += String.fromCharCode(c);
  }
  return name === WANTED;
}

/**
 * Cheap pre-check for an `/Encrypt` name token (also written with #xx
 * escapes); a hit is confirmed by qpdf. The encryption dictionary's trailer
 * key is never inside a compressed object stream, so a real one is always
 * visible here.
 */
export function mayBeEncrypted(bytes: Uint8Array): boolean {
  for (let i = 0; i < bytes.length; i++)
    if (bytes[i] === 0x2f && isEncryptName(bytes, i)) return true;
  return false;
}

/**
 * Plaintext bytes ready for any tool, or `locked` when an open password is
 * needed. Permissions-only (owner-password) files open without asking, as
 * they do in every PDF reader.
 */
export async function preparePdf(
  bytes: Uint8Array,
  engine: UnlockEngine,
  signal?: AbortSignal,
): Promise<PreparedPdf> {
  if (!mayBeEncrypted(bytes))
    return { status: 'ready', bytes, wasEncrypted: false };
  const info = await engine.inspect(bytes, undefined, signal);
  if (!info.encrypted) return { status: 'ready', bytes, wasEncrypted: false };
  if (info.needsPassword) return { status: 'locked' };
  const out = await engine.decrypt(bytes, '', signal);
  return { status: 'ready', bytes: out.bytes, wasEncrypted: true };
}

export async function unlockWithPassword(
  bytes: Uint8Array,
  password: string,
  engine: UnlockEngine,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  if (!password) throw new ToolError('INVALID_INPUT', 'Enter the password');
  return (await engine.decrypt(bytes, password, signal)).bytes;
}
