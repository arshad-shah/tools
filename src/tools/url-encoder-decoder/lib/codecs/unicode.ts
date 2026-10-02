import { CodecError, type Codec } from './codec';

const hex4 = (n: number) => n.toString(16).toUpperCase().padStart(4, '0');

const ESCAPE =
  /\\u\{([0-9a-fA-F]{1,6})\}|\\u([0-9a-fA-F]{4})|\\x([0-9a-fA-F]{2})|&#[xX]([0-9a-fA-F]{1,6});|&#([0-9]{1,7});|[Uu]\+([0-9a-fA-F]{4,6})|\\u|\\x/g;

function fromCodePointAt(cp: number, at: number, text: string): string {
  if (cp > 0x10ffff)
    throw new CodecError(`"${text}" is beyond the last code point`, at);
  // Lone surrogates from \uD83D\uDE00 join up when concatenated.
  return String.fromCodePoint(cp);
}

/**
 * Unicode escapes in every common style: \uXXXX (surrogate pairs join
 * up), \u{...}, \xXX, &#x...;, &#...; and U+XXXX.
 */
export function decodeUnicode(s: string): string {
  return s.replace(
    ESCAPE,
    (whole, braced, u4, x2, ent16, ent10, uplus, at: number) => {
      const hex = braced ?? u4 ?? x2 ?? ent16 ?? uplus;
      if (hex !== undefined)
        return fromCodePointAt(parseInt(hex, 16), at, whole);
      if (ent10 !== undefined)
        return fromCodePointAt(parseInt(ent10, 10), at, whole);
      throw new CodecError(`Incomplete escape "${whole}"`, at);
    },
  );
}

export const unicode: Codec = {
  id: 'unicode',
  label: 'Unicode escapes',
  about:
    'Writes every character outside printable ASCII as \\uXXXX, or \\u{XXXXX} above U+FFFF. Decoding also reads \\xXX, &#x...;, &#...; and U+XXXX, and joins surrogate pairs.',
  encode: (s) => {
    let out = '';
    for (const ch of s) {
      const cp = ch.codePointAt(0)!;
      if (cp >= 0x20 && cp <= 0x7e) out += ch;
      else if (cp > 0xffff) out += `\\u{${cp.toString(16).toUpperCase()}}`;
      else out += `\\u${hex4(cp)}`;
    }
    return out;
  },
  decode: decodeUnicode,
};
