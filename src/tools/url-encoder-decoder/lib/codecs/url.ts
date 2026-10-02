import { CodecError, decodeUtf8At, type Codec } from './codec';

const HEX = /^[0-9a-fA-F]{2}$/;
// What encodeURI leaves escaped when decoding (decodeURI's reserved set).
const RESERVED = new Set(';/?:@&=+$,#'.split('').map((c) => c.charCodeAt(0)));

/**
 * Percent-decoding with positions (1-based in messages): a run of %XX is
 * gathered and read as UTF-8, so a cut-off multi-byte character reports
 * where it starts.
 */
export function percentDecode(
  s: string,
  { plusIsSpace = false, keepReserved = false } = {},
): string {
  let out = '';
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (ch === '+' && plusIsSpace) {
      out += ' ';
      i++;
      continue;
    }
    if (ch !== '%') {
      out += ch;
      i++;
      continue;
    }
    const bytes: number[] = [];
    const positions: number[] = [];
    const raw: string[] = [];
    while (i < s.length && s[i] === '%') {
      const pair = s.slice(i + 1, i + 3);
      if (!HEX.test(pair)) {
        if (bytes.length) break;
        throw new CodecError(`Invalid percent escape "%${pair}"`, i);
      }
      bytes.push(parseInt(pair, 16));
      positions.push(i);
      raw.push(s.slice(i, i + 3));
      i += 3;
    }
    if (keepReserved) {
      // Decode around reserved ASCII bytes, which stay escaped.
      let start = 0;
      for (let k = 0; k <= bytes.length; k++) {
        if (k === bytes.length || RESERVED.has(bytes[k])) {
          out += decodeUtf8At(
            bytes.slice(start, k),
            positions.slice(start, k),
            'percent sequence',
          );
          if (k < bytes.length) out += raw[k];
          start = k + 1;
        }
      }
    } else out += decodeUtf8At(bytes, positions, 'percent sequence');
  }
  return out;
}

const FORM_EXTRA = /[!'()*~]/g;
const pct = (c: string) =>
  '%' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0');

export const urlComponent: Codec = {
  id: 'url-component',
  label: 'URL component',
  about:
    "Percent-encodes everything except letters, digits and - _ . ! ~ * ' ( ), as encodeURIComponent does. Use it for one query value or path segment.",
  encode: (s) => encodeURIComponent(s),
  decode: (s) => percentDecode(s),
};

export const urlFull: Codec = {
  id: 'url-full',
  label: 'URL (full URI)',
  about:
    'Encodes a whole URI as encodeURI does: the separators / ? : @ & = + $ , # stay as they are, so the URL keeps its structure.',
  encode: (s) => encodeURI(s),
  decode: (s) => percentDecode(s, { keepReserved: true }),
};

export const form: Codec = {
  id: 'form',
  label: 'Form (x-www-form-urlencoded)',
  about:
    "HTML form encoding: like the URL component codec, but a space becomes + and ! ' ( ) * ~ are escaped too. A + decodes to a space.",
  encode: (s) =>
    encodeURIComponent(s).replace(FORM_EXTRA, pct).replace(/%20/g, '+'),
  decode: (s) => percentDecode(s, { plusIsSpace: true }),
};
