import { Encodings, type EncodingType } from '@pdf-lib/standard-fonts';

/*
 * Code to glyph-name tables for simple fonts whose widths come from the
 * standard 14 metrics (PDF 32000-1 Annex D).
 */

type Table = ReadonlyMap<number, string>;

function invert(e: EncodingType): Table {
  const m = (
    e as unknown as { unicodeMappings: Record<string, [number, string]> }
  ).unicodeMappings;
  const out = new Map<number, string>();
  for (const [code, glyph] of Object.values(m))
    if (!out.has(code)) out.set(code, glyph);
  return out;
}

let winAnsi: Table | null = null;
let standard: Table | null = null;
let macRoman: Table | null = null;
let symbol: Table | null = null;
let dingbats: Table | null = null;

const STANDARD_HIGH: Record<number, string> = {
  161: 'exclamdown',
  162: 'cent',
  163: 'sterling',
  164: 'fraction',
  165: 'yen',
  166: 'florin',
  167: 'section',
  168: 'currency',
  169: 'quotesingle',
  170: 'quotedblleft',
  171: 'guillemotleft',
  172: 'guilsinglleft',
  173: 'guilsinglright',
  174: 'fi',
  175: 'fl',
  177: 'endash',
  178: 'dagger',
  179: 'daggerdbl',
  180: 'periodcentered',
  182: 'paragraph',
  183: 'bullet',
  184: 'quotesinglbase',
  185: 'quotedblbase',
  186: 'quotedblright',
  187: 'guillemotright',
  188: 'ellipsis',
  189: 'perthousand',
  191: 'questiondown',
  193: 'grave',
  194: 'acute',
  195: 'circumflex',
  196: 'tilde',
  197: 'macron',
  198: 'breve',
  199: 'dotaccent',
  200: 'dieresis',
  202: 'ring',
  203: 'cedilla',
  205: 'hungarumlaut',
  206: 'ogonek',
  207: 'caron',
  208: 'emdash',
  225: 'AE',
  227: 'ordfeminine',
  232: 'Lslash',
  233: 'Oslash',
  234: 'OE',
  235: 'ordmasculine',
  241: 'ae',
  245: 'dotlessi',
  248: 'lslash',
  249: 'oslash',
  250: 'oe',
  251: 'germandbls',
};

const ascii = (quote: string, grave: string): Map<number, string> => {
  const base = winAnsiTable();
  const out = new Map<number, string>();
  for (let c = 32; c < 127; c++) {
    const g = base.get(c);
    if (g) out.set(c, g);
  }
  out.set(0x27, quote);
  out.set(0x60, grave);
  return out;
};

export function winAnsiTable(): Table {
  if (!winAnsi) {
    const t = new Map(invert(Encodings.WinAnsi));
    // @pdf-lib/standard-fonts names code 159 'ydieresis' (code 255 is).
    t.set(0x9f, 'Ydieresis');
    winAnsi = t;
  }
  return winAnsi;
}

export function standardTable(): Table {
  if (!standard) {
    const t = ascii('quoteright', 'quoteleft');
    for (const [c, g] of Object.entries(STANDARD_HIGH)) t.set(Number(c), g);
    standard = t;
  }
  return standard;
}

/*
 * MacRomanEncoding codes 128 to 255 as Unicode code points (Mac OS Roman),
 * 0 where PDF's MacRomanEncoding has no glyph: Annex D leaves out the 15
 * Mac OS symbols (notequal, infinity, pi, the apple logo...), puts
 * currency at 0xDB and space at 0xCA.
 */
// prettier-ignore
const MAC_ROMAN_HIGH = [
  0xc4, 0xc5, 0xc7, 0xc9, 0xd1, 0xd6, 0xdc, 0xe1, 0xe0, 0xe2, 0xe4, 0xe3, 0xe5, 0xe7, 0xe9, 0xe8,
  0xea, 0xeb, 0xed, 0xec, 0xee, 0xef, 0xf1, 0xf3, 0xf2, 0xf4, 0xf6, 0xf5, 0xfa, 0xf9, 0xfb, 0xfc,
  0x2020, 0xb0, 0xa2, 0xa3, 0xa7, 0x2022, 0xb6, 0xdf, 0xae, 0xa9, 0x2122, 0xb4, 0xa8, 0, 0xc6, 0xd8,
  0, 0xb1, 0, 0, 0xa5, 0xb5, 0, 0, 0, 0, 0, 0xaa, 0xba, 0, 0xe6, 0xf8,
  0xbf, 0xa1, 0xac, 0, 0x192, 0, 0, 0xab, 0xbb, 0x2026, 0xa0, 0xc0, 0xc3, 0xd5, 0x152, 0x153,
  0x2013, 0x2014, 0x201c, 0x201d, 0x2018, 0x2019, 0xf7, 0, 0xff, 0x178, 0x2044, 0xa4, 0x2039, 0x203a, 0xfb01, 0xfb02,
  0x2021, 0xb7, 0x201a, 0x201e, 0x2030, 0xc2, 0xca, 0xc1, 0xcb, 0xc8, 0xcd, 0xce, 0xcf, 0xcc, 0xd3, 0xd4,
  0, 0xd2, 0xda, 0xdb, 0xd9, 0x131, 0x2c6, 0x2dc, 0xaf, 0x2d8, 0x2d9, 0x2da, 0xb8, 0x2dd, 0x2db, 0x2c7,
];

/**
 * Glyph names for the MacRoman code points WinAnsi does not carry, and
 * U+0178, which @pdf-lib/standard-fonts names 'ydieresis'.
 */
const NAMES_OUTSIDE_WIN_ANSI: Record<number, string> = {
  0x178: 'Ydieresis',
  0x131: 'dotlessi',
  0x2c7: 'caron',
  0x2d8: 'breve',
  0x2d9: 'dotaccent',
  0x2da: 'ring',
  0x2db: 'ogonek',
  0x2dd: 'hungarumlaut',
  0x2044: 'fraction',
  0xfb01: 'fi',
  0xfb02: 'fl',
};

export function macRomanTable(): Table {
  if (!macRoman) {
    const t = ascii('quotesingle', 'grave');
    const byUnicode = (
      Encodings.WinAnsi as unknown as {
        unicodeMappings: Record<string, [number, string]>;
      }
    ).unicodeMappings;
    MAC_ROMAN_HIGH.forEach((cp, i) => {
      const glyph = cp
        ? (NAMES_OUTSIDE_WIN_ANSI[cp] ?? byUnicode[String(cp)]?.[1])
        : undefined;
      if (glyph) t.set(128 + i, glyph);
    });
    macRoman = t;
  }
  return macRoman;
}

export function symbolTable(): Table {
  return (symbol ??= invert(Encodings.Symbol));
}

export function dingbatsTable(): Table {
  return (dingbats ??= invert(Encodings.ZapfDingbats));
}

export function baseEncoding(name: string | undefined): Table | null {
  switch (name) {
    case 'WinAnsiEncoding':
      return winAnsiTable();
    case 'StandardEncoding':
      return standardTable();
    case 'MacRomanEncoding':
      return macRomanTable();
    default:
      return null;
  }
}
