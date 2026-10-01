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

const TOKEN = Array.from('/Encrypt', (c) => c.charCodeAt(0));
const isNameChar = (c: number) =>
  (c >= 0x30 && c <= 0x39) ||
  (c >= 0x41 && c <= 0x5a) ||
  (c >= 0x61 && c <= 0x7a);

/**
 * Cheap pre-check for an `/Encrypt` name token; a hit is confirmed by qpdf.
 * The encryption dictionary's trailer key is never inside a compressed
 * object stream, so a real one is always visible here.
 */
export function mayBeEncrypted(bytes: Uint8Array): boolean {
  outer: for (let i = 0; i <= bytes.length - TOKEN.length; i++) {
    if (bytes[i] !== 0x2f) continue;
    for (let k = 1; k < TOKEN.length; k++)
      if (bytes[i + k] !== TOKEN[k]) continue outer;
    if (!isNameChar(bytes[i + TOKEN.length] ?? 0x20)) return true;
  }
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
