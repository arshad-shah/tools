import {
  base32ToBytes,
  bytesToBase32,
  utf8Encode,
} from '@/shared/lib/encoding';
import { ToolError } from '@/shared/lib/errors';
import type { Codec } from './codec';

export const base32: Codec = {
  id: 'base32',
  label: 'Base32',
  about:
    'RFC 4648 Base32 of the UTF-8 bytes: A to Z and 2 to 7, padded with = to a multiple of eight characters. Decoding accepts any case and ignores spaces.',
  encode: (s) => bytesToBase32(utf8Encode(s)),
  decode: (s) => {
    const bytes = base32ToBytes(s);
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch (cause) {
      throw new ToolError(
        'INVALID_INPUT',
        'The decoded bytes are not UTF-8 text',
        { cause },
      );
    }
  },
};
