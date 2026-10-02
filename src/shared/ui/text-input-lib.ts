import { ToolError } from '@/shared/lib/errors';
import { formatBytes } from '@/shared/lib/format';

/** Encodings TextInputPanel can read files in (spec §4.1). */
export type TextEncodingId =
  | 'utf-8'
  | 'windows-1252'
  | 'iso-8859-1'
  | 'utf-16le';

export const ENCODING_LABELS: Record<TextEncodingId, string> = {
  'utf-8': 'UTF-8',
  'windows-1252': 'Windows-1252',
  'iso-8859-1': 'ISO-8859-1 (Latin-1)',
  'utf-16le': 'UTF-16 LE',
};

/** How far into a file a NUL byte marks it as binary. */
export const BINARY_SNIFF_BYTES = 8 * 1024;

/** UTF-8 byte length without encoding (lone surrogates count as U+FFFD, 3). */
export function utf8Length(text: string): number {
  let n = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c < 0x80) n += 1;
    else if (c < 0x800) n += 2;
    else if (c >= 0xd800 && c <= 0xdbff && i + 1 < text.length) {
      const d = text.charCodeAt(i + 1);
      if (d >= 0xdc00 && d <= 0xdfff) {
        n += 4;
        i++;
      } else n += 3;
    } else n += 3;
  }
  return n;
}

/** Characters as code points (a surrogate pair is one character). */
export function codePointCount(text: string): number {
  let n = text.length;
  for (let i = 0; i < text.length - 1; i++) {
    const c = text.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff) {
      const d = text.charCodeAt(i + 1);
      if (d >= 0xdc00 && d <= 0xdfff) {
        n--;
        i++;
      }
    }
  }
  return n;
}

export function lineCount(text: string): number {
  let n = 1;
  for (let i = text.indexOf('\n'); i >= 0; i = text.indexOf('\n', i + 1)) n++;
  return n;
}

export const looksBinary = (bytes: Uint8Array) =>
  bytes.subarray(0, BINARY_SNIFF_BYTES).includes(0);

export const tooLarge = (what: string, limit: number) =>
  new ToolError(
    'TOO_LARGE',
    `${what} is larger than the ${formatBytes(limit)} limit`,
  );

/**
 * Windows-1252 code points for bytes 0x80 to 0x9F (WHATWG Encoding index;
 * the five unassigned bytes keep their own value). Decoded by hand because
 * some engines' TextDecoder treat this label as Latin-1.
 */
const CP1252_HIGH = [
  0x20ac, 0x81, 0x201a, 0x192, 0x201e, 0x2026, 0x2020, 0x2021, 0x2c6, 0x2030,
  0x160, 0x2039, 0x152, 0x8d, 0x17d, 0x8f, 0x90, 0x2018, 0x2019, 0x201c, 0x201d,
  0x2022, 0x2013, 0x2014, 0x2dc, 0x2122, 0x161, 0x203a, 0x153, 0x9d, 0x17e,
  0x178,
];

function decodeSingleByte(bytes: Uint8Array, cp1252: boolean): string {
  const codes = new Array<number>(Math.min(bytes.length, 0x8000));
  let out = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    const chunk = bytes.subarray(i, i + 0x8000);
    codes.length = chunk.length;
    for (let j = 0; j < chunk.length; j++) {
      const b = chunk[j];
      codes[j] = cp1252 && b >= 0x80 && b <= 0x9f ? CP1252_HIGH[b - 0x80] : b;
    }
    out += String.fromCharCode(...codes);
  }
  return out;
}

/**
 * Decodes file bytes as text. UTF-8 and UTF-16 are strict (invalid data is
 * an error, never silently replaced); ISO-8859-1 maps each byte to the same
 * code point (the WHATWG decoder would treat it as Windows-1252), and
 * Windows-1252 differs from it only in 0x80 to 0x9F. Binary
 * data (a NUL in the first 8 KB) is refused unless `acceptBinary`; UTF-16
 * text is full of NULs, so it is never sniffed.
 */
export function decodeText(
  bytes: Uint8Array,
  encoding: TextEncodingId,
  name: string,
  acceptBinary = false,
): string {
  if (!acceptBinary && encoding !== 'utf-16le' && looksBinary(bytes))
    throw new ToolError(
      'INVALID_FILE',
      `This looks like a binary file (${name})`,
    );
  if (encoding === 'iso-8859-1' || encoding === 'windows-1252')
    return decodeSingleByte(bytes, encoding === 'windows-1252');
  try {
    return new TextDecoder(encoding, { fatal: true }).decode(bytes);
  } catch (cause) {
    throw new ToolError(
      'INVALID_FILE',
      `${name} is not valid ${ENCODING_LABELS[encoding]} text; try another encoding`,
      { cause },
    );
  }
}
