import { utf8Encode } from '@/shared/lib/encoding';
import { CodecError, decodeUtf8At, type Codec } from './codec';

/** UTF-8 bytes as hex pairs; spaces, colons, commas, 0x and \x tolerated. */
export function decodeHexText(s: string): string {
  const bytes: number[] = [];
  const positions: number[] = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (/[\s:,-]/.test(ch)) {
      i++;
      continue;
    }
    if (/^(0x|\\x)/i.test(s.slice(i, i + 2))) {
      i += 2;
      continue;
    }
    if (!/[0-9a-fA-F]/.test(ch))
      throw new CodecError(`Not a hex digit "${ch}"`, i);
    if (!/[0-9a-fA-F]/.test(s[i + 1] ?? ''))
      throw new CodecError('Hex digits must come in pairs', i);
    bytes.push(parseInt(s.slice(i, i + 2), 16));
    positions.push(i);
    i += 2;
  }
  return decodeUtf8At(bytes, positions, 'hex byte sequence');
}

export const hex: Codec = {
  id: 'hex',
  label: 'Hex (UTF-8 bytes)',
  about:
    'Each UTF-8 byte of the text as two hex digits, separated by spaces. Decoding ignores spaces, colons, commas and 0x or \\x prefixes.',
  encode: (s) =>
    Array.from(utf8Encode(s), (b) => b.toString(16).padStart(2, '0')).join(' '),
  decode: decodeHexText,
};
