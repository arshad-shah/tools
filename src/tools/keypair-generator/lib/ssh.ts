import {
  base64UrlToBytes,
  bytesToBase64,
  utf8Encode,
} from '@/shared/lib/encoding';
import { ToolError } from '@/shared/lib/errors';

/**
 * OpenSSH public keys (RFC 4253 section 6.6, RFC 5656, RFC 8709) built from
 * a public JWK: the wire-format blob, the one-line authorized_keys form and
 * the SHA-256 fingerprint as `ssh-keygen -l` prints it.
 */

/** RFC 4251 `string`: a uint32 length, then the bytes. */
export function sshString(bytes: Uint8Array): Uint8Array {
  const out = new Uint8Array(4 + bytes.length);
  new DataView(out.buffer).setUint32(0, bytes.length);
  out.set(bytes, 4);
  return out;
}

/**
 * RFC 4251 `mpint` of a non-negative big-endian integer: leading zero bytes
 * dropped, and one 0x00 added when the top bit is set (so it reads as
 * positive).
 */
export function sshMpint(unsigned: Uint8Array): Uint8Array {
  let i = 0;
  while (i < unsigned.length && unsigned[i] === 0) i++;
  const trimmed = unsigned.subarray(i);
  if (trimmed.length && trimmed[0] & 0x80) {
    const padded = new Uint8Array(trimmed.length + 1);
    padded.set(trimmed, 1);
    return sshString(padded);
  }
  return sshString(trimmed);
}

const concat = (parts: Uint8Array[]): Uint8Array => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
};

const text = (s: string) => sshString(utf8Encode(s));

const CURVE_IDS: Record<string, string> = {
  'P-256': 'nistp256',
  'P-384': 'nistp384',
  'P-521': 'nistp521',
};

export interface SshPublicKey {
  /** "ssh-rsa", "ecdsa-sha2-nistp256", "ssh-ed25519". */
  type: string;
  /** The wire-format public key. */
  blob: Uint8Array;
  /** Key size as ssh-keygen reports it. */
  bits: number;
  /** "RSA", "ECDSA", "ED25519", as ssh-keygen prints after the comment. */
  label: string;
}

const need = (jwk: JsonWebKey, ...keys: (keyof JsonWebKey)[]) => {
  for (const k of keys)
    if (typeof jwk[k] !== 'string')
      throw new ToolError('INVALID_INPUT', `The key has no "${k}" member`);
};

/** The OpenSSH public key for an RSA, EC (P-256/384/521) or Ed25519 JWK. */
export function sshPublicKey(jwk: JsonWebKey): SshPublicKey {
  if (jwk.kty === 'RSA') {
    need(jwk, 'n', 'e');
    const n = base64UrlToBytes(jwk.n!);
    let lead = 0;
    while (lead < n.length && n[lead] === 0) lead++;
    const bits = (n.length - lead) * 8 - Math.clz32(n[lead] ?? 0) + 24;
    return {
      type: 'ssh-rsa',
      blob: concat([
        text('ssh-rsa'),
        sshMpint(base64UrlToBytes(jwk.e!)),
        sshMpint(n),
      ]),
      bits,
      label: 'RSA',
    };
  }
  if (jwk.kty === 'EC') {
    need(jwk, 'crv', 'x', 'y');
    const id = CURVE_IDS[jwk.crv!];
    if (!id)
      throw new ToolError(
        'UNSUPPORTED_FEATURE',
        `OpenSSH has no ${jwk.crv} keys`,
      );
    const x = base64UrlToBytes(jwk.x!);
    const y = base64UrlToBytes(jwk.y!);
    const point = concat([Uint8Array.of(4), x, y]);
    const type = `ecdsa-sha2-${id}`;
    return {
      type,
      blob: concat([text(type), text(id), sshString(point)]),
      bits: Number(jwk.crv!.slice(2)),
      label: 'ECDSA',
    };
  }
  if (jwk.kty === 'OKP' && jwk.crv === 'Ed25519') {
    need(jwk, 'x');
    return {
      type: 'ssh-ed25519',
      blob: concat([text('ssh-ed25519'), sshString(base64UrlToBytes(jwk.x!))]),
      bits: 256,
      label: 'ED25519',
    };
  }
  throw new ToolError(
    'UNSUPPORTED_FEATURE',
    'Only RSA, ECDSA and Ed25519 keys have an OpenSSH public key',
  );
}

/** Comments are one line: line breaks become spaces. */
const oneLine = (s: string) => s.replace(/[\r\n]+/g, ' ').trim();

/** The authorized_keys line: `type base64 [comment]`. */
export function sshPublicLine(key: SshPublicKey, comment = ''): string {
  const c = oneLine(comment);
  return `${key.type} ${bytesToBase64(key.blob)}${c ? ` ${c}` : ''}`;
}

/** `SHA256:` and the unpadded Base64 SHA-256 of the blob (ssh-keygen -l). */
export async function sshFingerprint(blob: Uint8Array): Promise<string> {
  const digest = new Uint8Array(
    await crypto.subtle.digest('SHA-256', blob as Uint8Array<ArrayBuffer>),
  );
  return `SHA256:${bytesToBase64(digest, { padding: false })}`;
}

/** The whole `ssh-keygen -l` line: bits, fingerprint, comment, type. */
export function sshKeygenLine(
  key: SshPublicKey,
  fingerprint: string,
  comment = '',
): string {
  const c = oneLine(comment) || 'no comment';
  return `${key.bits} ${fingerprint} ${c} (${key.label})`;
}

/** Reads an RFC 4251 blob back into its fields (for checks and tests). */
export function readSshFields(blob: Uint8Array): Uint8Array[] {
  const view = new DataView(blob.buffer, blob.byteOffset, blob.byteLength);
  const fields: Uint8Array[] = [];
  let at = 0;
  while (at < blob.length) {
    if (at + 4 > blob.length)
      throw new ToolError('INVALID_INPUT', 'The SSH key blob is truncated');
    const len = view.getUint32(at);
    at += 4;
    if (at + len > blob.length)
      throw new ToolError('INVALID_INPUT', 'The SSH key blob is truncated');
    fields.push(blob.subarray(at, at + len));
    at += len;
  }
  return fields;
}
