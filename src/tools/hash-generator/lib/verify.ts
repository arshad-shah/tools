import { base64ToBytes } from '@/shared/lib/encoding';
import { digestInfo, type DigestId } from '@/shared/lib/crypto/digest';

export interface ExpectedMatch {
  /** The algorithm whose result equals the expected value. */
  match: DigestId | null;
  /** Selected algorithms whose digest length fits the expected value. */
  candidates: DigestId[];
}

// "sha256:", "SHA-256 =", "md5 " and the like before the value.
const PREFIX = /^[a-z][a-z0-9/-]*\s*[:=]\s*(?=\S)/i;

/**
 * The expected value as lowercase hex: prefixes, whitespace and a trailing
 * file name (`sha256sum` lines) are ignored, and Base64 is accepted too.
 * Null when it is neither.
 */
export function normalizeExpected(expected: string): string | null {
  let s = expected.trim().replace(PREFIX, '');
  const line = /^([0-9a-f]+)\s+[*]?\S/i.exec(s);
  if (line) s = line[1];
  s = s.replace(/\s+/g, '');
  if (s === '') return null;
  if (/^[0-9a-f]+$/i.test(s) && s.length % 2 === 0) return s.toLowerCase();
  try {
    const bytes = base64ToBytes(s);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return null;
  }
}

/**
 * Compares an expected hash with the computed hex results (spec §8.4): the
 * matching algorithm, or the ones whose length fits when none matches.
 */
export function matchExpected(
  expected: string,
  results: Partial<Record<DigestId, string>>,
): ExpectedMatch {
  const hex = normalizeExpected(expected);
  if (hex === null) return { match: null, candidates: [] };
  const ids = Object.keys(results) as DigestId[];
  const match = ids.find((id) => results[id]?.toLowerCase() === hex) ?? null;
  const candidates = ids.filter(
    (id) => digestInfo(id).hexLength === hex.length,
  );
  return { match, candidates };
}
