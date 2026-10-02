import { Encodings, type EncodingType } from '@pdf-lib/standard-fonts';

/*
 * Code to glyph-name tables for simple fonts whose widths come from the
 * standard 14 metrics (PDF 32000-1 Annex D). MacRoman codes above 127 are
 * not listed: their glyphs fall back to /MissingWidth, which verification
 * catches (the page is then turned into an image).
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
  return (winAnsi ??= invert(Encodings.WinAnsi));
}

export function standardTable(): Table {
  if (!standard) {
    const t = ascii('quoteright', 'quoteleft');
    for (const [c, g] of Object.entries(STANDARD_HIGH)) t.set(Number(c), g);
    standard = t;
  }
  return standard;
}

export function macRomanTable(): Table {
  return (macRoman ??= ascii('quotesingle', 'grave'));
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
