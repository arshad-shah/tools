import {
  bytesToBase32,
  bytesToBase58,
  utf8Decode,
} from '@/shared/lib/encoding';
import {
  convertFraction,
  decomposeFloat,
  formatInBase,
  fromTwos,
  overflows,
  toBytes,
  toTwos,
  unixPermissions,
  type FloatParts,
  type FractionDigits,
  type WordBits,
} from '@/shared/lib/numbers';

export interface DeriveOptions {
  bits: WordBits;
  signed: boolean;
  /** Base of the custom field, 2 to 36. */
  customBase: number;
  /** Fraction digits shown per base. */
  fractionPrecision: number;
  /** Fraction digits as typed, and the base they were typed in. */
  fraction?: { digits: string; base: number };
}

export type FieldKey = 'bin' | 'oct' | 'dec' | 'hex' | 'custom';

export interface Derived {
  bin: string;
  oct: string;
  dec: string;
  hex: string;
  custom: string;
  base32?: string;
  base58?: string;
  /** Hex bytes, most significant first. */
  bytesBE: string;
  bytesLE: string;
  /** One readout per byte (big-endian): the character or its control name. */
  ascii: string[];
  /** The bytes as UTF-8 text without leading zero bytes, or null when invalid. */
  utf8: string | null;
  /** The value does not fit the chosen width: the fields show its low bits. */
  overflow: boolean;
  /** The bit pattern at the chosen width (unsigned). */
  pattern: bigint;
  float?: FloatParts;
  perms?: string;
  /** Whether each field's fraction repeats forever. */
  repeating?: Partial<Record<FieldKey, boolean>>;
}

const CONTROL = [
  'NUL',
  'SOH',
  'STX',
  'ETX',
  'EOT',
  'ENQ',
  'ACK',
  'BEL',
  'BS',
  'HT',
  'LF',
  'VT',
  'FF',
  'CR',
  'SO',
  'SI',
  'DLE',
  'DC1',
  'DC2',
  'DC3',
  'DC4',
  'NAK',
  'SYN',
  'ETB',
  'CAN',
  'EM',
  'SUB',
  'ESC',
  'FS',
  'GS',
  'RS',
  'US',
];

/** A byte as its ASCII character, control name (NUL, DEL) or hex. */
export function byteName(b: number): string {
  if (b < 32) return CONTROL[b];
  if (b === 32) return 'SP';
  if (b === 127) return 'DEL';
  if (b < 127) return String.fromCharCode(b);
  return `0x${b.toString(16).toUpperCase().padStart(2, '0')}`;
}

const hexBytes = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).toUpperCase().padStart(2, '0')).join(
    ' ',
  );

/**
 * Every view of a value at a word size (spec §8.5 Number Base Converter).
 * The bin, oct, hex and custom fields show the two's-complement bit
 * pattern; dec shows the signed or unsigned reading of it, so 255 at 8-bit
 * signed reads -1 with hex FF. A value outside both the signed and unsigned
 * ranges sets `overflow` and is cut to its low bits.
 */
export function deriveAll(value: bigint, opts: DeriveOptions): Derived {
  const { bits, signed, customBase } = opts;
  const pattern = toTwos(value, bits);
  const view = signed ? fromTwos(pattern, bits) : pattern;
  const overflow =
    overflows(value, bits, true) && overflows(value, bits, false);
  const be = toBytes(pattern, bits, 'be');
  const trimmed = be.slice(
    Math.max(
      0,
      be.findIndex((b) => b !== 0),
    ),
  );
  let utf8: string | null;
  try {
    utf8 = pattern === 0n ? '' : utf8Decode(trimmed);
  } catch {
    utf8 = null;
  }
  const out: Derived = {
    bin: formatInBase(pattern, 2),
    oct: formatInBase(pattern, 8),
    dec: view.toString(),
    hex: formatInBase(pattern, 16),
    custom: formatInBase(pattern, customBase),
    base32: bytesToBase32(be, { padding: false }),
    base58: bytesToBase58(be),
    bytesBE: hexBytes(be),
    bytesLE: hexBytes(toBytes(pattern, bits, 'le')),
    ascii: Array.from(be, byteName),
    utf8,
    overflow,
    pattern,
  };
  if (bits === 32 || bits === 64) out.float = decomposeFloat(bits, pattern);
  if (pattern <= 0o7777n)
    out.perms = unixPermissions(pattern.toString(8).padStart(3, '0'));
  if (opts.fraction?.digits) {
    const bases: Record<FieldKey, number> = {
      bin: 2,
      oct: 8,
      dec: 10,
      hex: 16,
      custom: customBase,
    };
    out.repeating = {};
    for (const key of Object.keys(bases) as FieldKey[]) {
      const f: FractionDigits = convertFraction(
        opts.fraction.digits,
        opts.fraction.base,
        bases[key],
        opts.fractionPrecision,
      );
      if (f.digits) out[key] = `${out[key]}.${f.digits}`;
      out.repeating[key] = f.repeating;
    }
  }
  return out;
}
