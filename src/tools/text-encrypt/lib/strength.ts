import { entropyBits } from '@/tools/password-generator/lib/entropy';

/**
 * A rough entropy estimate for a typed passphrase: length times log2 of the
 * character classes it uses (an upper bound; real phrases are weaker).
 */
export function estimateBits(pass: string): number {
  let pool = 0;
  if (/[a-z]/.test(pass)) pool += 26;
  if (/[A-Z]/.test(pass)) pool += 26;
  if (/[0-9]/.test(pass)) pool += 10;
  if (/[^A-Za-z0-9]/.test(pass)) pool += 33;
  return entropyBits(pool, [...pass].length);
}
