import { bytesToBase64 } from '@/shared/lib/encoding';

export type DigestFormat = 'hex' | 'HEX' | 'base64' | 'base64url';

export const DIGEST_FORMATS: { value: DigestFormat; label: string }[] = [
  { value: 'hex', label: 'hex' },
  { value: 'HEX', label: 'HEX' },
  { value: 'base64', label: 'Base64' },
  { value: 'base64url', label: 'Base64url' },
];

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length >> 1);
  for (let i = 0; i < out.length; i++)
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/** A hex digest in the chosen output format. */
export function formatDigest(hex: string, fmt: DigestFormat): string {
  if (fmt === 'hex') return hex.toLowerCase();
  if (fmt === 'HEX') return hex.toUpperCase();
  return bytesToBase64(hexToBytes(hex), { urlSafe: fmt === 'base64url' });
}
