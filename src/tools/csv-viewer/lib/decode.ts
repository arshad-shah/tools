export const TEXT_ENCODINGS = [
  'auto',
  'utf-8',
  'windows-1252',
  'iso-8859-1',
  'utf-16le',
  'utf-16be',
] as const;
export type TextEncodingChoice = (typeof TEXT_ENCODINGS)[number];
export type TextEncodingName = Exclude<TextEncodingChoice, 'auto'>;

export const ENCODING_LABEL: Record<TextEncodingChoice, string> = {
  auto: 'Auto-detect',
  'utf-8': 'UTF-8',
  'windows-1252': 'Windows-1252',
  'iso-8859-1': 'ISO-8859-1 (Latin-1)',
  'utf-16le': 'UTF-16 LE',
  'utf-16be': 'UTF-16 BE',
};

export const isTextEncodingChoice = (v: unknown): v is TextEncodingChoice =>
  (TEXT_ENCODINGS as readonly unknown[]).includes(v);

function bomOf(
  b: Uint8Array,
): { encoding: TextEncodingName; size: number } | null {
  if (b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf)
    return { encoding: 'utf-8', size: 3 };
  if (b[0] === 0xff && b[1] === 0xfe) return { encoding: 'utf-16le', size: 2 };
  if (b[0] === 0xfe && b[1] === 0xff) return { encoding: 'utf-16be', size: 2 };
  return null;
}

// Windows-1252 0x80..0x9F (WHATWG index); 0 marks the five unmapped bytes,
// which decode to the C1 control of the same value.
const CP1252_HIGH = [
  0x20ac, 0, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030,
  0x0160, 0x2039, 0x0152, 0, 0x017d, 0, 0, 0x2018, 0x2019, 0x201c, 0x201d,
  0x2022, 0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0, 0x017e,
  0x0178,
];

/**
 * Single-byte decoding by hand: true ISO-8859-1 maps every byte to the code
 * point of the same value, and Windows-1252 differs only in 0x80..0x9F.
 * (The WHATWG decoder treats ISO-8859-1 as Windows-1252, and some runtimes
 * decode Windows-1252 as Latin-1, so neither is trusted here.)
 */
function decodeSingleByte(bytes: Uint8Array, cp1252: boolean): string {
  const codes = new Uint16Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    codes[i] =
      cp1252 && b >= 0x80 && b <= 0x9f ? CP1252_HIGH[b - 0x80] || b : b;
  }
  let out = '';
  for (let i = 0; i < codes.length; i += 8192)
    out += String.fromCharCode(...codes.subarray(i, i + 8192));
  return out;
}

function decodeAs(bytes: Uint8Array, encoding: TextEncodingName): string {
  if (encoding === 'iso-8859-1') return decodeSingleByte(bytes, false);
  if (encoding === 'windows-1252') return decodeSingleByte(bytes, true);
  // ignoreBOM: the BOM is stripped by the caller, never twice.
  return new TextDecoder(encoding, { ignoreBOM: true }).decode(bytes);
}

/**
 * Bytes to text. `auto` honours a byte-order mark first, then tries strict
 * UTF-8, then falls back to Windows-1252 (the usual encoding of CSV saved
 * by Excel on Windows). A matching BOM is never part of the text.
 */
export function decodeBytes(
  bytes: Uint8Array,
  encoding: TextEncodingChoice = 'auto',
): { text: string; encoding: TextEncodingName } {
  const bom = bomOf(bytes);
  if (encoding === 'auto') {
    if (bom)
      return {
        text: decodeAs(bytes.subarray(bom.size), bom.encoding),
        encoding: bom.encoding,
      };
    try {
      const text = new TextDecoder('utf-8', {
        fatal: true,
        ignoreBOM: true,
      }).decode(bytes);
      return { text, encoding: 'utf-8' };
    } catch {
      return {
        text: decodeAs(bytes, 'windows-1252'),
        encoding: 'windows-1252',
      };
    }
  }
  const body = bom?.encoding === encoding ? bytes.subarray(bom.size) : bytes;
  return { text: decodeAs(body, encoding), encoding };
}
